import json,subprocess
PROJECT='hepqrz8hrz58omwradhcvzgj'
SPEC={'auth': {'disabled': ['ANON_KEY', 'AUTH_PROOF_SECRET', 'CREDITS_API_KEY', 'EXTRACTION_API_KEY', 'OPENAI_API_KEY', 'PAYMENTS_API_KEY', 'RESEND_API_KEY', 'SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'WORKER_KEY'], 'memory': 134217728, 'nanoCpus': 150000000}, 'gateway': {'disabled': ['AUTH_PROOF_SECRET', 'CREDITS_API_KEY', 'EXTRACTION_API_KEY', 'JWT_SECRET', 'OPENAI_API_KEY', 'PAYMENTS_API_KEY', 'POSTGRES_PASSWORD', 'RESEND_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'WORKER_KEY'], 'memory': 67108864, 'nanoCpus': 10000000}, 'mail': {'disabled': ['ANON_KEY', 'AUTH_PROOF_SECRET', 'CREDITS_API_KEY', 'EXTRACTION_API_KEY', 'JWT_SECRET', 'OPENAI_API_KEY', 'PAYMENTS_API_KEY', 'POSTGRES_PASSWORD', 'SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'WORKER_KEY'], 'memory': 67108864, 'nanoCpus': 50000000}, 'migrate': {'disabled': ['ANON_KEY', 'AUTH_PROOF_SECRET', 'CREDITS_API_KEY', 'EXTRACTION_API_KEY', 'JWT_SECRET', 'OPENAI_API_KEY', 'PAYMENTS_API_KEY', 'RESEND_API_KEY', 'SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'WORKER_KEY'], 'memory': 67108864, 'nanoCpus': 20000000}, 'postgres': {'disabled': ['ANON_KEY', 'AUTH_PROOF_SECRET', 'CREDITS_API_KEY', 'EXTRACTION_API_KEY', 'JWT_SECRET', 'OPENAI_API_KEY', 'PAYMENTS_API_KEY', 'RESEND_API_KEY', 'SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'WORKER_KEY'], 'memory': 1342177280, 'nanoCpus': 100000000}, 'rest': {'disabled': ['ANON_KEY', 'AUTH_PROOF_SECRET', 'CREDITS_API_KEY', 'EXTRACTION_API_KEY', 'OPENAI_API_KEY', 'PAYMENTS_API_KEY', 'RESEND_API_KEY', 'SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'WORKER_KEY'], 'memory': 134217728, 'nanoCpus': 30000000}, 'storage': {'disabled': ['AUTH_PROOF_SECRET', 'CREDITS_API_KEY', 'EXTRACTION_API_KEY', 'OPENAI_API_KEY', 'PAYMENTS_API_KEY', 'RESEND_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'WORKER_KEY'], 'memory': 536870912, 'nanoCpus': 100000000}, 'templates': {'disabled': ['ANON_KEY', 'AUTH_PROOF_SECRET', 'CREDITS_API_KEY', 'EXTRACTION_API_KEY', 'JWT_SECRET', 'OPENAI_API_KEY', 'PAYMENTS_API_KEY', 'POSTGRES_PASSWORD', 'RESEND_API_KEY', 'SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'WORKER_KEY'], 'memory': 67108864, 'nanoCpus': 10000000}, 'web': {'disabled': ['JWT_SECRET', 'OPENAI_API_KEY', 'POSTGRES_PASSWORD', 'RESEND_API_KEY', 'SERVICE_ROLE_KEY', 'WORKER_KEY'], 'memory': 536870912, 'nanoCpus': 280000000}, 'worker': {'disabled': ['ANON_KEY', 'AUTH_PROOF_SECRET', 'CREDITS_API_KEY', 'EXTRACTION_API_KEY', 'JWT_SECRET', 'PAYMENTS_API_KEY', 'POSTGRES_PASSWORD', 'SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'], 'memory': 268435456, 'nanoCpus': 250000000}}
def docker(*args):
 return subprocess.check_output(['docker',*args],text=True)
ids=docker('ps','-aq','--filter','label=com.docker.compose.project='+PROJECT).split()
assert len(ids)==10,'Expected exactly ten own containers'
objects=json.loads(docker('inspect',*ids));results=[]
for c in objects:
 labels=c['Config']['Labels'];assert labels.get('com.docker.compose.project')==PROJECT
 service=labels.get('com.docker.compose.service');assert service in SPEC
 spec=SPEC[service];env=dict(x.split('=',1) for x in c['Config']['Env'] if '=' in x)
 for key in spec['disabled']:
  assert env.get(key)=='disabled',service+': unexpected effective credential '+key
 if service!='storage':assert env.get('SERVICE_KEY')=='disabled',service+': auxiliary SERVICE_KEY'
 assert c['HostConfig']['Memory']==spec['memory'],service+': memory limit'
 assert c['HostConfig']['NanoCpus']==spec['nanoCpus'],service+': CPU limit'
 assert not c['HostConfig'].get('PortBindings'),service+': host port published'
 assert not c['State'].get('OOMKilled'),service+': OOM'
 if service=='migrate':assert c['State']['Status']=='exited' and c['State']['ExitCode']==0,'Migration failed'
 else:assert c['State']['Running'],service+': not running'
 health=c['State'].get('Health',{}).get('Status');assert service=='migrate' or health in (None,'healthy'),service+': unhealthy'
 networks=list(c['NetworkSettings']['Networks'])
 assert all(n==PROJECT or n.startswith(PROJECT+'_') or n.startswith(PROJECT+'-') for n in networks),service+': unexpected network'
 assert all(m['Type']!='bind' for m in c['Mounts']),service+': bind mount'
 assert all(m['Type']!='volume' or m['Name'].startswith(PROJECT) for m in c['Mounts']),service+': foreign volume'
 results.append({'service':service,'state':c['State']['Status'],'health':health,'memoryMiB':spec['memory']//1024**2,'cpus':spec['nanoCpus']/1e9,'credentialMasksPassed':True,'auxiliaryServiceKeySafe':True,'hostPorts':0,'networks':networks,'restarts':c['RestartCount']})
assert len({x['service'] for x in results})==10
print(json.dumps({'project':PROJECT,'passed':True,'services':results},indent=2))
