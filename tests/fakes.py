from datavalue import ComplexData, PrimitiveData, ValidationMode
from scic import Executable, SCIC

def primitive(data_type, name): return PrimitiveData(data_type=data_type,value=None,name=name,data_class=True)
def signature(name,*schemas): return ComplexData(data_type=list,value=None,name=name,possible_values=schemas,data_class=True,validation_mode=ValidationMode.POSITIONAL)
def build_scic():
    scic=SCIC(root_name="test")
    math=scic.create_context("math",description="Math")
    exe=Executable("add",signature("parameters",primitive(int,"a"),primitive(int,"b")),signature("results",primitive(int,"sum")),description="Add")
    scic.register_function(exe,lambda a,b:a+b,math)
    return scic.freeze()
