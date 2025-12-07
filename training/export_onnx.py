import torch
import torch.nn as nn
import os
from bit_astro.model import BitAstroGPT, BitAstroConfig
from bit_astro.ternary import TernaryLinear

class InferenceWrapper(nn.Module):
    """Wrapper that only returns logits (no loss) for clean ONNX export."""
    def __init__(self, model):
        super().__init__()
        self.model = model
    
    def forward(self, idx):
        logits, _ = self.model(idx, targets=None)
        return logits

def bake_ternary_weights(model):
    """
    Replaces all TernaryLinear layers with standard nn.Linear layers
    with the weights 'baked' in (i.e., pre-calculated ternary values).
    """
    print("Baking ternary weights into standard Linear layers...")
    
    modules_to_replace = []
    
    for name, module in model.named_modules():
        if isinstance(module, TernaryLinear):
            modules_to_replace.append((name, module))
            
    for name, module in modules_to_replace:
        with torch.no_grad():
            effective_weight = module.quant(module.weight)
        
        in_features = module.weight.shape[1]
        out_features = module.weight.shape[0]
        new_layer = nn.Linear(in_features, out_features, bias=module.bias is not None)
        
        new_layer.weight.data = effective_weight
        if module.bias is not None:
            new_layer.bias.data = module.bias.data
            
        parent_module = model
        path = name.split('.')
        for part in path[:-1]:
            parent_module = getattr(parent_module, part)
        
        setattr(parent_module, path[-1], new_layer)
        print(f"  Replaced {name} with nn.Linear")

    return model

def export_to_onnx(checkpoint_path, output_path):
    if not os.path.exists(checkpoint_path):
        print(f"Checkpoint not found at {checkpoint_path}")
        return

    print(f"Loading checkpoint from {checkpoint_path}...")
    checkpoint = torch.load(checkpoint_path, map_location='cpu')
    
    if 'config' in checkpoint:
        config_data = checkpoint['config']
        print("Loaded config from checkpoint")
        if isinstance(config_data, dict):
            config = BitAstroConfig(**config_data)
        else:
            config = config_data
    else:
        print("Config not found in checkpoint, using default")
        config = BitAstroConfig() 

    model = BitAstroGPT(config)
    
    state_dict = checkpoint['model_state_dict'] if 'model_state_dict' in checkpoint else checkpoint
    
    new_state_dict = {}
    for k, v in state_dict.items():
        new_key = k.replace('_orig_mod.', '').replace('module.', '')
        new_state_dict[new_key] = v
        
    model.load_state_dict(new_state_dict)
    model.eval()
    
    model = bake_ternary_weights(model)
    
    wrapped_model = InferenceWrapper(model)
    wrapped_model.eval()
    
    dummy_input = torch.randint(0, config.vocab_size, (1, 32), dtype=torch.long)
    
    print(f"Exporting to {output_path}...")
    print(f"  Vocab size: {config.vocab_size}")
    print(f"  Block size: {config.block_size}")
    
    torch.onnx.export(
        wrapped_model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=['input_ids'],
        output_names=['logits'],
        dynamic_axes={
            'input_ids': {0: 'batch_size', 1: 'sequence_length'},
            'logits': {0: 'batch_size', 1: 'sequence_length'}
        }
    )
    
    # Check for external data file and merge if needed
    data_file = output_path + ".data"
    if os.path.exists(data_file):
        print(f"External data file was created at {data_file}")
        print("Merging external data back into single ONNX file...")
        
        import onnx
        
        # Load the model with external data
        onnx_model = onnx.load(output_path, load_external_data=True)
        
        # Remove external data references
        for tensor in onnx_model.graph.initializer:
            if tensor.HasField('data_location'):
                tensor.ClearField('data_location')
        
        # Save as a single file
        output_single = output_path.replace('.onnx', '_single.onnx')
        onnx.save(onnx_model, output_single)
        
        # Replace original with single file
        os.remove(output_path)
        os.remove(data_file)
        os.rename(output_single, output_path)
        
        print(f"Merged into single file: {output_path}")
    else:
        print("All weights embedded in single ONNX file")
    
    file_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"Final model size: {file_size:.2f} MB")
    
    print("Export complete!")
    print(f"Model saved to {output_path}")

if __name__ == "__main__":
    CHECKPOINT_PATH = "checkpoints/bit_astro_best.pt"
    OUTPUT_PATH = "bit_astro.onnx"
    export_to_onnx(CHECKPOINT_PATH, OUTPUT_PATH)
