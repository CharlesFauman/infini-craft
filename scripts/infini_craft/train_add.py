# %%
from transformers import GPTQConfig, AutoTokenizer, AutoModelForCausalLM, AutoConfig, TrainingArguments, SchedulerType, DataCollatorForLanguageModeling
import pandas as pd
from peft import LoraConfig, TaskType
from trl import SFTTrainer
from datasets import Dataset
import pandas as pd
import torch
from transformers.training_args import OptimizerNames

# %%
model_path = "../../models/Llama-2-7B-Chat-GPTQ"
config = AutoConfig.from_pretrained(model_path)
model = AutoModelForCausalLM.from_pretrained(
    model_path,
    device_map="cuda:0",
    config=config,
    quantization_config=GPTQConfig(
        bits=4,
        disable_exllama=True,
    ),
)
# can't use cache when using gradient checkpointing
model.config.use_cache = False
tokenizer = AutoTokenizer.from_pretrained(model_path, use_fast=False, legacy=False)
tokenizer.add_special_tokens({'pad_token': '<pad>'})
tokenizer.padding_side = "right"
model.resize_token_embeddings(len(tokenizer))
data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

# %%
peft_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    inference_mode=False,
    r=64,
    lora_alpha=16,
    lora_dropout=0.1,
    # see https://arxiv.org/pdf/1911.02150.pdf why no o_proj
    target_modules=["k_proj", "q_proj", "v_proj", "down_proj", "gate_proj", "up_proj"], # no o_proj!
)

# %%
conversations = pd.read_json(
    path_or_buf="../../data/infini-craft-custom-train.jsonl",
    lines=True
)["messages"].to_list()

text = [tokenizer.apply_chat_template(conversation, tokenize=False) for conversation in conversations]

dataset = Dataset.from_dict({"text": text}, split="train").shuffle(seed=42)

# %%
training_arguments = TrainingArguments(
    output_dir="./results",
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    optim=OptimizerNames.ADAMW_HF,
    save_steps=10,
    logging_steps=1,
    learning_rate=2e-4,
    fp16=True,
    max_grad_norm=0.3,
    warmup_ratio=0.1,
    group_by_length=False,
    lr_scheduler_type=SchedulerType.COSINE,
    gradient_checkpointing=True,
    gradient_checkpointing_kwargs={'use_reentrant':False},
    max_steps=100,
)

trainer = SFTTrainer(
    model=model,
    train_dataset=dataset,
    peft_config=peft_config,
    dataset_text_field="text",
    max_seq_length=len(dataset),
    tokenizer=tokenizer,
    data_collator=data_collator,
    args=training_arguments,
    packing=True
)

# %%
trainer.train(resume_from_checkpoint=False)

# %%
trainer.model.save_pretrained("../../loras/infini_craft/infini_craft_llama7b_gptq_lora_add")