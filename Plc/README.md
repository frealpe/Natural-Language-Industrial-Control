# Automation Project: Frontend Interface (PLC)

This directory contains the project's frontend application, developed in React using the CoreUI template. It serves as the main interface for visualizing and controlling the automation system.

## Prerequisites

Ensure you have the following installed:
- **Node.js** (version 16 or higher recommended)
- **npm** or **yarn**

## Installation

To install all necessary dependencies, run:

```bash
npm install
# Or if you prefer yarn:
yarn install
```

## Configuration

Create a `.env` file in the root directory based on the example provided:

```bash
cp .example.env .env
```

Edit the `.env` file to match your environment configuration.


## Running the Application

### Development Mode
To start the development server with hot-reload:

```bash
npm start
```
By default, the application will be available at [http://localhost:5173](http://localhost:5173) (or the port automatically assigned by Vite).

### Production Build
To compile the application for production:

```bash
npm run build
```
The compiled files will be generated in the `build/` folder.

### Preview
To locally test the compiled version:

```bash
npm run serve
```

---
**Note:** This project is based on the [CoreUI PRO React Admin Template](https://coreui.io/product/react-dashboard-template/).
