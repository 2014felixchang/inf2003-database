Requirements:
- node.js (https://nodejs.org/en/download)
- Able to access Port 26780 for SQL Queries
(The database is hosted on Aiven cloud platform and uses port 26780)

Dependencies/Libraries needed:
- express
- mysql
- body-parser
- express-session
- bcrypt

1) Open Terminal/Command Prompt
2) Navigate to the folder containing the js and html file.
3) You can do 'npm install' or do: 'npm install express mysql body-parser express-session bcrypt'
This is to install the necessary libraries
(P.S. You would need to install node.js as 'npm' is part of node.js)

IF EVERYTHING STILL DONT WORK, GO inside the directory and perform the following commands:
npm rebuild bcrypt
npm uninstall bcrypt
npm install bcrypt
optional: npm cache clean --force

To run the web app:
1) Open Terminal/Command Prompt
2) Navigate to the folder containing the js and html file
3) Run: node server.js
4) Open your browser of choice and go to 'localhost:8080'

Test Accounts:
1) Admin -> admin:admin
2) Regular User -> user:user (you can also register your own account!)