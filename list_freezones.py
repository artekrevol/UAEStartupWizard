import json
import subprocess
import sys

try:
    output = subprocess.check_output(['curl', '-X', 'GET', 'http://localhost:5000/api/free-zones'])
    freezones = json.loads(output)
    
    print("Available Free Zones:")
    print("---------------------")
    for zone in freezones:
        print(f"ID: {zone['id']} - Name: {zone['name']}")
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)