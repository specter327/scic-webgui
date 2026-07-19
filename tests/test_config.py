import pytest

from scic_webgui import WebGUIConfig


def test_api_prefix_normalized():
    assert WebGUIConfig(api_prefix="api/x").api_prefix == "/api/x"


def test_invalid_port():
    with pytest.raises(ValueError):
        WebGUIConfig(port=0)


def test_dashboard_configuration():
    config = WebGUIConfig(
        dashboard_title="Operations",
        brand_mark="OS",
        dashboard_auto_probe=True,
        max_activity_entries=80,
    )
    assert config.dashboard_title == "Operations"
    assert config.brand_mark == "OS"
    assert config.dashboard_auto_probe is True
    assert config.max_activity_entries == 80


def test_invalid_activity_limit():
    with pytest.raises(ValueError):
        WebGUIConfig(max_activity_entries=0)


def test_extension_scripts_are_normalized():
    config = WebGUIConfig(extension_scripts=(" /a.js ", "", "/b.js"))
    assert config.extension_scripts == ("/a.js", "/b.js")
