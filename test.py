# test_auth.py
from database import db

ambulance = db.authenticate_ambulance("AMB001", "admin123")
print("Authentication result:", ambulance)

# Try with wrong password
ambulance = db.authenticate_ambulance("AMB001", "wrongpass")
print("Wrong password result:", ambulance)