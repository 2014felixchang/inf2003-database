Requirements:
- node.js (https://nodejs.org/en/download)

Dependencies/Libraries needed:
- express
- mysql
- body-parser
- express-session
- bcrypt

1) Open Terminal/Command Prompt
2) Navigate to the folder containing the js and html file.
3) You can do 'npm install' or do: 'npm install express mysql body-parser'
4) Run 'npm install express-session bcrypt' on terminal as well
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
