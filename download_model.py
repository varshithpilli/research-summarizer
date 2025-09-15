from huggingface_hub import snapshot_download
repo_id = "google/flan-t5-small"
local_dir = "./flan-t5-small"
snapshot_download(repo_id=repo_id, local_dir=local_dir)
