# Simulateur de Réseau de Petri - Machine à Café

Ce projet est un simulateur de réseau de Petri pour modéliser le fonctionnement d'une machine à café, développé avec Next.js et TypeScript.

## Description

Le simulateur permet de visualiser et d'interagir avec un réseau de Petri qui modélise le processus complet d'une machine à café, depuis l'insertion de la monnaie jusqu'à la distribution de la boisson.

### Fonctionnalités

- **Simulation interactive** : Tirez manuellement les transitions ou utilisez le mode aléatoire
- **Deux modes d'affichage** :
  - **Mode Liste** : Affichage traditionnel avec listes de places et transitions
  - **Mode Graphe** : Visualisation graphique interactive du réseau de Petri
- **Visualisation en temps réel** : Affichage des places, transitions et jetons
- **Gestion des ressources** : Suivi du stock (gobelets, café, eau)
- **Journal des étapes** : Historique des actions effectuées
- **Matrice d'incidence** : Représentation mathématique du réseau

### Composants du réseau de Petri

#### Places (flux principal)
- AttentClient, InsertionMonnaie, VérificationPaiement
- ChoixBoisson, VérificationStock, EauEnChauffe
- EauPrête, PréparationCafé, CaféPrêt
- DistributionBoisson, RetourAuRepos

#### Places (ressources)
- GobeletDispo (10 initial)
- DoseCafeDispo (50 initial)
- DoseEauDispo (100 initial)

#### Transitions
- InsérerPièce, ValiderMonnaie, PaiementInsuffisant
- AccèsChoixBoisson, ChoisirBoisson, StockOK/StockKO
- LancerChauffe, DémarrerPréparation, FinPréparation
- Distribuer, PrendreBoisson, Reset, Annuler

## Mode Graphique

Le mode graphique offre une visualisation interactive du réseau de Petri :

- **Cercles** : Représentent les places
  - Bleu : Places de flux 
  - Jaune : Places de stock (ressources)
- **Rectangles** : Représentent les transitions
  - Vert : Transitions tirables (cliquables)
  - Gris : Transitions non-tirables
- **Flèches** : Représentent les arcs du réseau
- **Nombres rouges** : Indiquent le nombre de jetons dans chaque place
- **Interaction** : Cliquez sur les transitions vertes pour les tirer
- **Déplacement** : Glissez-déposez les éléments pour réorganiser le graphe

## Installation et utilisation

1. **Installation des dépendances** :
   ```bash
   npm install
   ```

2. **Lancement en mode développement** :
   ```bash
   npm run dev
   ```

3. **Accès à l'application** :
   Ouvrez votre navigateur à l'adresse : `http://localhost:3000`

## Scripts disponibles

- `npm run dev` : Démarre le serveur de développement
- `npm run build` : Compile l'application pour la production
- `npm run start` : Démarre l'application en mode production
- `npm run lint` : Vérifie le code avec ESLint

## Technologies utilisées

- **Next.js 15** : Framework React pour applications web
- **TypeScript** : Typage statique pour JavaScript
- **Tailwind CSS** : Framework CSS utilitaire
- **React 18** : Bibliothèque d'interface utilisateur
- **D3.js** : Bibliothèque de visualisation de données pour le mode graphique

## Structure du projet

```
src/
├── app/
│   ├── globals.css          # Styles globaux avec Tailwind
│   ├── layout.tsx           # Layout principal de l'application
│   └── page.tsx             # Page d'accueil
└── components/
    ├── CoffeePetriSim.tsx   # Composant principal du simulateur
    └── PetriNetGraph.tsx    # Composant de visualisation graphique
```

## Contribuer

1. Forkez le projet
2. Créez votre branche de fonctionnalité (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Committez vos changements (`git commit -am 'Ajout d'une nouvelle fonctionnalité'`)
4. Poussez vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrez une Pull Request

## Licence

Ce projet est destiné à des fins éducatives.
