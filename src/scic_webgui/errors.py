class SCICWebGUIError(Exception):
    """Base package error."""

class ThemeNotFoundError(SCICWebGUIError):
    pass

class InvalidThemeError(SCICWebGUIError):
    pass
