from __future__ import annotations
from importlib.metadata import entry_points
from .builtin import theme_package as builtin_theme_package
from .model import Theme, ThemePackage
from ..errors import InvalidThemeError, ThemeNotFoundError

class ThemeRegistry:
    def __init__(self, discover: bool = True) -> None:
        self._packages: dict[str, ThemePackage] = {}
        self.register(builtin_theme_package)
        if discover:
            self.discover()

    def register(self, package: ThemePackage) -> None:
        if not isinstance(package, ThemePackage):
            raise InvalidThemeError("Theme entry point must expose ThemePackage")
        self._packages[package.identifier] = package

    def discover(self) -> None:
        for entry_point in entry_points(group="scic_webgui.themes"):
            if entry_point.name == "default":
                continue
            loaded = entry_point.load()
            package = loaded() if callable(loaded) and not isinstance(loaded, ThemePackage) else loaded
            self.register(package)

    def packages(self) -> tuple[ThemePackage, ...]:
        return tuple(self._packages.values())

    def get_package(self, identifier: str) -> ThemePackage:
        try:
            return self._packages[identifier]
        except KeyError as error:
            raise ThemeNotFoundError(identifier) from error

    def get_theme(self, package: str, variant: str) -> Theme:
        try:
            return self.get_package(package).get(variant)
        except KeyError as error:
            raise ThemeNotFoundError(f"{package}:{variant}") from error

    def describe(self) -> list[dict]:
        return [package.to_dict() for package in self.packages()]
