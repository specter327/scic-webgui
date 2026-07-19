import pytest
from scic_webgui import WebGUIConfig


def test_api_prefix_normalized():
    assert WebGUIConfig(api_prefix="api/x").api_prefix == "/api/x"


def test_invalid_port():
    with pytest.raises(ValueError):
        WebGUIConfig(port=0)


def test_extension_scripts_are_normalized():
    config = WebGUIConfig(extension_scripts=(" /a.js ", "", "/b.js"))
    assert config.extension_scripts == ("/a.js", "/b.js")
