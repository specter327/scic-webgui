from fastapi.testclient import TestClient
from scic_webgui import SCICWebGUI, WebGUIConfig
from .fakes import build_scic

def client(): return TestClient(SCICWebGUI(build_scic(),WebGUIConfig()).app)
def test_tree_and_index():
    c=client(); assert c.get('/').status_code==200
    data=c.get('/api/scic/v1/tree').json(); assert data['tree']['name']=='test'
def test_describe_and_invoke():
    c=client(); d=c.get('/api/scic/v1/describe',params={'path':'/test/math/add'}); assert d.status_code==200
    r=c.post('/api/scic/v1/invoke',json={'path':'/test/math/add','arguments':['20','22']}); assert r.status_code==200; assert r.json()['results']==[42]
def test_session_header_is_returned():
    c=client(); r=c.get('/api/scic/v1/context'); assert r.headers['x-scic-session']
