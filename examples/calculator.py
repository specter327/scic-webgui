from datavalue import ComplexData, PrimitiveData, ValidationMode
from scic import Executable, SCIC
from scic_webgui import SCICWebGUI, WebGUIConfig

def primitive(data_type, name):
    return PrimitiveData(data_type=data_type, value=None, name=name, data_class=True)

def signature(name, *schemas):
    return ComplexData(data_type=list, value=None, name=name, possible_values=schemas, data_class=True, validation_mode=ValidationMode.POSITIONAL)

def build_application() -> SCIC:
    app = SCIC(root_name="calculator")
    math = app.create_context("math", description="Mathematical operations")
    add = Executable(name="add", description="Add two integers", parameters=signature("parameters", primitive(int,"number_a"), primitive(int,"number_b")), results=signature("results", primitive(int,"sum")))
    app.register_function(add, lambda a,b:a+b, math)
    return app.freeze()

application = build_application()

if __name__ == "__main__":
    SCICWebGUI(application, WebGUIConfig(application_name="Calculator", application_description="SCIC WebGUI example", open_browser=True)).run()
