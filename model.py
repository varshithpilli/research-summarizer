# # # import boto3
# # # import json

# # # # Create Bedrock Runtime client
# # # client = boto3.client('bedrock-runtime', region_name='us-east-1')

# # # # DeepSeek R1 expects this input format
# # # body = json.dumps({
# # #     "prompt": "Write a 1000-word essay on living on Mars.",
# # #     "max_tokens": 1000,
# # #     "temperature": 0.7,
# # #     "top_p": 0.9
# # # })

# # # # Invoke model with streaming
# # # response = client.invoke_model_with_response_stream(
# # #     modelId='deepseek.r1-v1:0',
# # #     body=body,
# # #     contentType='application/json',
# # #     accept='application/json'
# # # )

# # # # Handle streaming output
# # # stream = response.get("body")
# # # if stream:
# # #     for event in stream:
# # #         chunk = event.get("chunk")
# # #         if chunk:
# # #             data = json.loads(chunk["bytes"].decode("utf-8"))
# # #             # Expected format: {"choices": [{"text": "...", "stop_reason": "..."}]}
# # #             for choice in data.get("choices", []):
# # #                 print(choice.get("text", ""), end="", flush=True)

import boto3

client = boto3.client('bedrock', region_name='us-east-1')
response = client.list_foundation_models()

for model in response['modelSummaries']:
    print(f"{model['modelId']} (Provider: {model['providerName']})")



# import boto3
# import json

# def stream_mistral():
#     client = boto3.client('bedrock-runtime', region_name='us-east-1')

#     body = json.dumps({
#         "prompt": "Write a short story about a dragon who loves pizza.",
#         "max_tokens_to_sample": 512,
#         "temperature": 0.7,
#         "top_p": 0.9
#     })

#     response = client.invoke_model_with_response_stream(
#         modelId='mistral.7b',  # Mistral pay-as-you-go model
#         body=body,
#         contentType='application/json',
#         accept='application/json'
#     )

#     stream = response.get('body')
#     if stream:
#         for event in stream:
#             chunk = event.get('chunk')
#             if chunk:
#                 data = json.loads(chunk['bytes'].decode('utf-8'))
#                 # Mistral returns {"completion": "..."} in streaming chunks
#                 text = data.get('completion')
#                 if text:
#                     print(text, end='', flush=True)

# if __name__ == "__main__":
#     stream_mistral()


# import boto3

# client = boto3.client('bedrock', region_name='us-east-1')

# response = client.list_foundation_models()

# print("Available models:")
# for model in response.get('models', []):
#     print(f"- {model['modelId']} (Provider: {model['provider']})")
