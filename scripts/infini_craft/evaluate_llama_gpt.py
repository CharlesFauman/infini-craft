# %%
from exllamav2 import (
    ExLlamaV2,
    ExLlamaV2Config,
    ExLlamaV2Cache,
    ExLlamaV2Tokenizer,
    ExLlamaV2Lora,
)

from exllamav2.generator import (
    ExLlamaV2BaseGenerator,
    ExLlamaV2StreamingGenerator,
    ExLlamaV2Sampler
)
from transformers import AutoTokenizer

model_path = "../../models/Llama-2-7B-Chat-GPTQ"
config = ExLlamaV2Config(model_path)
model = ExLlamaV2(config)
model.load()
tokenizer = ExLlamaV2Tokenizer(config)
cache = ExLlamaV2Cache(model)

# %%
streaming_generator = ExLlamaV2StreamingGenerator(model, cache, tokenizer)
streaming_generator.warmup()
streaming_generator.set_stop_conditions([tokenizer.eos_token_id])

simple_generator = ExLlamaV2BaseGenerator(model, cache, tokenizer)

# %%
tokenizer_for_template = AutoTokenizer.from_pretrained(model_path)
def create_prompt(symbol):    
    return [
        {
            "role": "user",
            "content": symbol
        }
    ]

def convert_response(response):
    word_emoji = response[:-1].split(" [/INST] ")[-1]
    return word_emoji.rsplit(" ", 1)

def convert_inverse_response(response):
    word_emojis = response[:-1].split(" [/INST] ")[-1]
    return [word_emoji.rsplit(" ", 1) for word_emoji in word_emojis.split("+", 1)]

lora_split_path = "../../loras/infini_craft/infini_craft_llama7b_gptq_lora_split"
lora_split = ExLlamaV2Lora.from_directory(model, lora_split_path)

lora_add_path = "../../loras/infini_craft/infini_craft_llama7b_gptq_lora_add"
lora_add = ExLlamaV2Lora.from_directory(model, lora_add_path)

conversations = [create_prompt("Mechanical")]
converted = [tokenizer_for_template.apply_chat_template(conversation, tokenize=False) for conversation in conversations]


settings = ExLlamaV2Sampler.Settings(temperature=0)
generated = simple_generator.generate_simple(
    converted,
    settings,
    30,
    loras = lora_split,
    encode_special_tokens=True,
    decode_special_tokens=False,
)

parsed = [convert_inverse_response(g) for g in generated]
print(parsed)

# %%
conversations = [create_prompt("Mouse+Cat")]
converted = [tokenizer_for_template.apply_chat_template(conversation, tokenize=False) for conversation in conversations]


settings = ExLlamaV2Sampler.Settings(temperature=0)
generated = simple_generator.generate_simple(
    converted,
    settings,
    30,
    loras = lora_add,
    encode_special_tokens=True,
    decode_special_tokens=False,
)

parsed = [convert_response(g) for g in generated]
print(parsed)