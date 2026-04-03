<div align="center">
<img width="1200" alt="IIIT BBSR Banner" src="https://media.licdn.com/dms/image/v2/C561BAQF0wBqNjfL8TQ/company-background_10000/company-background_10000/0/1626719935585/international_institute_of_information_technology_bhubaneswar_cover?e=2147483647&v=beta&t=sLvDd8c8dW1oEyC1EJn3UU3osJUdKZdD75XqwnxrY6Y" />
</div>
**SpendWise** — IIIT Bhubaneswar Student Expense Tracker

A full-stack financial management tool designed specifically for students at **IIIT Bhubaneswar** to track daily expenses, mess rebates, and campus-related spending.

## 🏛️ Campus Project Context
Developed as a utility project to help batch-mates manage their monthly budgets effectively. This tool helps in categorizing expenditures across campus facilities like the Central Mess, Canteens, and local transport.

## 🚀 Tech Stack
* **Frontend:** React.js, Vite, Tailwind CSS
* **Backend:** Node.js, Express.js (TypeScript)
* **Database:** PostgreSQL (Production) / SQLite (Local)
* **Authentication:** JWT-based Secure Login & Google OAuth 2.0

## 🛠️ Local Setup Instructions

**Prerequisites:** * Node.js (v18+)
* NPM or Yarn

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/DAIMAXKYUREM/personal-expense-tracker.git](https://github.com/DAIMAXKYUREM/personal-expense-tracker.git)
    cd personal-expense-tracker
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    Create a `.env` file in the root directory and add your configurations (refer to `.env.example`):
    ```text
    PORT=3000
    JWT_SECRET=your_secret_key
    APP_URL=http://localhost:3000
    POSTGRES_URL=your_database_url
    ```
    
4.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    
## 🏗️ Deployment
This project is configured for seamless deployment on **Vercel** with integrated **PostgreSQL** storage. 
**Institute:** International Institute of Information Technology, Bhubaneswar





