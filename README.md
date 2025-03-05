# Czech Adjectives Rating Project

**This project was created in collaboration with the Department of Psychology at the University of Ostrava.**

## Project Overview

The aim of this project is to collect user ratings for a set of Czech adjectives based on their perceived **valence** (positive, neutral, negative) and **arousal** (high, medium, low). The goal is to better understand the emotional impact of these adjectives through user participation.

**This project was created in collaboration with the Department of Psychology at the University of Ostrava.**

## Research Focus

This research focuses on understanding the subjective experience of emotion through spatial metaphors in three-dimensional space. We are specially interested in how people perceive and place emotionally charged words in 3D space, and how these spatial metaphors vary in different environments - on a monitor screen versus in virtual reality (VR). In this way, we are exploring the relationship between emotional valence (positive, negative, neutral) and arousal level (high, medium, low) with specific spatial locations.

We want to further contribute to theories of embodied cognition (embodiment) that emphasize the connection between the body and cognitive processes, especially in the context of emotional perception. With interested in questions about whether and how different physical environments (VR versus monitor) affect the perception and spatial representation of emotions, which could contribute to a broader understanding of how our emotional experiences are "embodied" in physical space.

## Features

- **Adjective Display**: The system randomly displays an adjective from the Firestore database for the user to rate.
- **Rating System**: Users rate each adjective on the dimensions of valence and arousal using a simple and intuitive interface.
- **Data Collection**: All user ratings are stored in Firebase Firestore. To prevent data skewing, each adjective is tracked by how many times it has been rated.

## Technologies Used

- **Frontend**: HTML, CSS, and JavaScript for the user interface and interaction logic.
- **Backend**: Firebase Firestore for storing adjective data and user ratings.
- **Hosting**: GitHub Pages for hosting the static website.

## How to Use the Application

1. **Introduction Screen**: The user starts on an introductory page explaining the project. Here, they can read about the purpose of the study and familiarize themselves with the rating process.
2. **Practice Rating**: Users have the opportunity to practice rating a couple of example adjectives to understand the process before starting the actual test.
3. **Demographic Questionnaire**: Users fill out a short demographic questionnaire (age, gender, education) before starting the real ratings.
4. **Adjective Rating**: Users rate 15 adjectives based on their perceived valence and arousal.
5. **Completion**: After completing the ratings, the user's data is anonymized and submitted for research purposes.

## Data Privacy

The project ensures that all data collected is anonymous and used solely for research purposes. No personally identifiable information is collected, and participation is completely voluntary.

## Contact

For any questions regarding the project, please contact **Matias Bunnik** at matias.bunnik.s01@osu.cz or the **Department of Psychology at the University of Ostrava**.
