## Prerequisites

### For setting up the environment, I recommend
GPU with at least 8 GB memory. Only tested on 3080TI

1. [Optional] Mamba / conda https://mamba.readthedocs.io/en/latest/installation/mamba-installation.html
2. [Optional] pipx https://github.com/pypa/pipx, and then `pipx install poetry`

## Getting started

### Install (Ensure you run these in the `scripts` directory)
1. Create env: `mamba create -n infini_craft python=3.10.13`
2. Activate env: `mamba activate infini_craft`
3. Install cuda in env: `mamba install cuda -c nvidia/label/cuda-12.1.0`
4. Install python deps: `poetry install`
5. Install base model: `cd models && git clone https://huggingface.co/TheBloke/Llama-2-7B-Chat-GPTQ --branch gptq-4bit-32g-actorder_True --single-branch`


## Running
Run from scripts directory, with the env activated, and the model downloaded to models

`uvicorn infini_craft.server:app --reload`


### Note on Exllama
exllama import builds on first install - takes a few minutes

Also, if it throws an error - just try it again, it'll work.