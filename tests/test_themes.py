from scic_webgui import ThemeRegistry

def test_builtin_theme_package():
    registry=ThemeRegistry(discover=False)
    package=registry.get_package('default')
    assert package.get('light').variant=='light'
    assert package.get('dark').variant=='dark'
