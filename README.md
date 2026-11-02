This is the repo for version 3 of Interactive Survey Tools For Data Visualization, mirrored from version 2 repo: https://github.com/beheyx/Interactive-Survey-Tool-For-Data-Visualization-v2

# Description
Version 3 will build on the previous version by cleaning up the ui, converting the visual files into a more optimized type, and setting up the project for production.

# Team Roster and Contact
- Kali: pulancop@oregonstate.edu
- Kai Johnson: johnkai5@oregonstate.edu
- Norman Nomie: nomien@oregonstate.edu
- Collin Vassallo: vassallc@oregonstate.edu
- Xiyuan Liang: liangxiy@oregonstate.edu

# Overview
The goal of this project is to develop a custom web-based survey tool that allows researchers at Oregon State University (or other
organizations) to create interactive surveys featuring advanced data visualizations. Unlike existing platforms like Qualtrics, this tool supports dynamic elements such as zooming, panning, and selecting regions on visual assets like SVGs, allowing researchers to gather more nuanced and insightful data and responses. The platform emphasizes usability, accessibility, and data security, aiming to enhance both the researcher and participant experience while addressing the limitations of current survey tools.

Visit the landing page here: [https://seanmccoyosu.github.io/Interactive-Survey-Tools-For-Data-Visualizations/]

# Dependencies
To run this application on your local device, copy the repository and ensure the necessary dependencies are installed.

### Node
1. Go to the official Node.js website: https://nodejs.org
2. Download the LTS version for your operating system (Windows/macOS/Linux).
3. Run the installer and follow the prompts (accept default options).
4. Open the terminal in your IDE and verify the installation:
```
node -v
npm -v
```

### Docker (Desktop)
1. Go to https://www.docker.com/products/docker-desktop
2. Download Docker Desktop for your OS and run the installer.
3. After installation, launch Docker Desktop and sign in with a (new) Docker Hub account.
4. In the terminal, check for successful installation:
```
docker --version
docker compose version
```

# Quick Testing Guide for Your Local Machine
### Launching
We need to set up the mySQL database in Docker:
- first make sure the script is executable, run `chmod +x make_containers_NO_API.sh`
- run the script `./make_containers_NO_API.sh`

Run **`docker compose up --build`** to run the application. This may take a while. 

After the containers finish starting, open the following URLs to verify that everything is running:

- **`http://localhost:5000/` — the main application**
- `http://localhost:8000/` — the visualization/UI service

### Troubleshoot
- If you are having mySQL errors such as access denied or your docker is not loading API containers, try `sed -i 's/\r$//' wait-for.sh`
- If you are having modules related errors like missing modules, try `npm install` to update and install all the dependencies needed.

### Cleaning
Run `docker compose down` to stop and remove Docker containers. 

Run `docker compose down -v` to stop and remove the containers and delete the Docker volume containing the MySQL database data.


# Branching and Reviews
We follow a simple workflow to manage development and ensure code quality:

- **Branching:** New work is done in `feature/` branches (e.g., `feature/tools`).
- **Pull Requests (PRs):** Changes are pushed to a feature branch, then a PR is opened targeting `main`.
- **Review:** At least one teammate reviews and approves the PR before it is merged.
- **Template:** PRs use the template in `.github/PULL_REQUEST_TEMPLATE.md` to include description, checklist, and testing notes.


# More Info
Please refer to this repository's wiki page for help:
https://github.com/seanmccoyOSU/Interactive-Survey-Tools-For-Data-Visualizations/wiki
