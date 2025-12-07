from .model import BitAstroConfig

def default_config(vocab_size: int, block_size: int = 256) -> BitAstroConfig:
    return BitAstroConfig(
        vocab_size=vocab_size,
        block_size=block_size,
        d_model=256,
        n_layers=4,
        n_heads=8,
        d_mlp=512,
        dropout=0.1,
        binarize_activations=False,
        use_ternary=True,
    )


def small_config(vocab_size: int, block_size: int = 64) -> BitAstroConfig:
    return BitAstroConfig(
        vocab_size=vocab_size,
        block_size=block_size,
        d_model=64,
        n_layers=2,
        n_heads=2,
        d_mlp=128,
        dropout=0.0,
        binarize_activations=False,
    )
