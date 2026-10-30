import hashlib
import json
from pathlib import Path
from urllib.request import urlopen


MODEL_DIR = Path(__file__).resolve().parent / "model"
MODEL_REVISION = "06ebf5e308e100fd000d738c42b059ebb5f58a16"
MODEL_URL = (
    "https://huggingface.co/rodynaemad/plant-disease-dinov2-small/"
    f"resolve/{MODEL_REVISION}/onnx/model_with_features.onnx"
)
MODEL_SHA256 = "3bb0a1ce3ccc13d34ac17fc04e631765252419ac8377f966970765f473f6cb00"
CONFIG_URL = (
    "https://huggingface.co/rodynaemad/plant-disease-dinov2-small/"
    f"resolve/{MODEL_REVISION}/config.json"
)
LEAF_DETECTOR_REVISION = "ccd390f303a32c8063ae54c09c1ac3b9ee158dea"
LEAF_DETECTOR_URL = (
    "https://huggingface.co/pedromiguelsanchez/yolo-plant-leaf-detection/"
    f"resolve/{LEAF_DETECTOR_REVISION}/yolo11x_leaf.pt"
)
LEAF_DETECTOR_SHA256 = (
    "ac2bd7f82f9fd1e054f496a90f21ce77eb9697b27a71a4ecdf6d7c47ac71408b"
)


def download(url, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = destination.with_suffix(destination.suffix + ".download")
    with urlopen(url, timeout=60) as response, temporary_path.open("wb") as output:
        while chunk := response.read(1024 * 1024):
            output.write(chunk)
    temporary_path.replace(destination)


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as model_file:
        for chunk in iter(lambda: model_file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    model_path = MODEL_DIR / "plant_disease_model.onnx"
    config_path = MODEL_DIR / "disease_model_config.json"
    leaf_detector_path = MODEL_DIR / "yolo11x_leaf.pt"

    if model_path.exists():
        digest = sha256_file(model_path)
        if digest != MODEL_SHA256:
            model_path.unlink()

    if not model_path.exists():
        print("Downloading the 88 MB plant disease model...")
        download(MODEL_URL, model_path)

    digest = sha256_file(model_path)
    if digest != MODEL_SHA256:
        model_path.unlink(missing_ok=True)
        raise RuntimeError("Downloaded disease model failed its SHA-256 check.")

    if not config_path.exists():
        print("Downloading disease model class labels...")
        download(CONFIG_URL, config_path)

    with config_path.open(encoding="utf-8") as config_file:
        model_config = json.load(config_file)
    labels = model_config.get("id2label", {})
    if len(labels) != 38:
        raise RuntimeError("Disease model config must contain 38 class labels.")

    if leaf_detector_path.exists():
        digest = sha256_file(leaf_detector_path)
        if digest != LEAF_DETECTOR_SHA256:
            leaf_detector_path.unlink()

    if not leaf_detector_path.exists():
        print("Downloading the 114 MB plant leaf detector...")
        download(LEAF_DETECTOR_URL, leaf_detector_path)

    digest = sha256_file(leaf_detector_path)
    if digest != LEAF_DETECTOR_SHA256:
        leaf_detector_path.unlink(missing_ok=True)
        raise RuntimeError("Downloaded leaf detector failed its SHA-256 check.")

    class_names_path = MODEL_DIR / "class_names.json"
    class_names_path.write_text(
        json.dumps([labels[str(index)] for index in range(len(labels))], indent=4)
        + "\n",
        encoding="utf-8",
    )
    print(f"Disease model installed and verified at {model_path}")
    print(f"Leaf detector installed and verified at {leaf_detector_path}")


if __name__ == "__main__":
    main()
