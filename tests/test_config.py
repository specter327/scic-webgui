import pytest
from scic_webgui import WebGUIConfig

def test_api_prefix_normalized(): assert WebGUIConfig(api_prefix='api/x').api_prefix=='/api/x'
def test_invalid_port():
    with pytest.raises(ValueError): WebGUIConfig(port=0)
