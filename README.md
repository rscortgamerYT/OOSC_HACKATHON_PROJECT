# 🚨 SOS Alert App

A simple emergency SOS application that allows users to quickly notify their emergency contacts in case of danger. The app automatically sends an SOS alert with location details and requests confirmation from the contacts whether they are responding. If one contact cannot respond, the system automatically escalates to other contacts.

---

## 🔑 Features

- **One-Click SOS**: Press the SOS button to immediately notify your emergency contacts.
- **Real-Time Alerts**: Contacts receive an SOS alert with the time and optional message.
- **Response Tracking**: Contacts can respond with:
  - ✅ "I’m Responding"
  - ❌ "Can’t Respond"
- **Escalation**: If a contact cannot respond, the alert is forwarded to other contacts.
- **Location Sharing**: Sends the current location with the alert (if enabled).
- **Logs & History**: Keeps track of all alerts and responses for reference.

---

## 🖼️ Screenshots

### 1. **SOS Alert to Contact**
When someone sends an SOS alert, the contact sees:
- Who needs help  
- Time of the alert  
- Option to respond or decline  

![SOS Alert Screenshot](./11.png)

---

### 2. **Main Dashboard**
The user dashboard allows:
- Sending an SOS with one button  
- Adding optional messages (e.g., location, situation)  
- Viewing latest alerts, responses, and contact details  

![Dashboard Screenshot](./2.png)

---

## ⚙️ How It Works
1. The user presses the **SOS button**.
2. Emergency contacts are instantly notified via SMS or app alert.
3. Contacts confirm if they are responding.
4. If no one responds, the alert automatically escalates to other contacts.

---

## 🚀 Getting Started

### Prerequisites
- Node.js / Python (depending on your backend choice)
- Twilio (or similar SMS service) for sending alerts
- MongoDB / Firebase (for storing contacts and alerts)

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/sos-alert-app.git

# Install dependencies
npm install
# or
pip install -r requirements.txt
