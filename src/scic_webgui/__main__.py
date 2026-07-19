from __future__ import annotations
import argparse
from .application import SCICWebGUI
from .config import WebGUIConfig
from .loader import load_scic

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="scic-webgui", description="Run a ready-to-use WebGUI for a SCIC application")
    parser.add_argument("application", help="SCIC instance or factory as module:attribute")
    parser.add_argument("--name", default="SCIC")
    parser.add_argument("--description", default="Generic SCIC application interface")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--theme", default="default")
    parser.add_argument("--variant", choices=("light", "dark", "system"), default="system")
    parser.add_argument("--open-browser", action="store_true")
    parser.add_argument("--reload", action="store_true")
    return parser

def main() -> None:
    args = build_parser().parse_args()
    scic = load_scic(args.application)
    config = WebGUIConfig(application_name=args.name, application_description=args.description, host=args.host, port=args.port, default_theme=args.theme, default_variant=args.variant, open_browser=args.open_browser)
    SCICWebGUI(scic, config).run(reload=args.reload)

if __name__ == "__main__":
    main()
