# 💰 PanierExpress

**PanierExpress** est une application web progressive (PWA) de gestion d’inventaire et de courses avec suivi de budget.  
Elle permet de gérer facilement vos articles, leurs prix, quantités, catégories, et génère automatiquement une liste de courses basée sur votre stock.

---

## ✨ Fonctionnalités

### 📦 Gestion d’inventaire
- Ajout, modification, suppression d’articles
- Quantité possédée, unité (pièces, kg, L, paquets, etc.)
- Prix unitaire (€)
- **Mode binaire** (j’ai / j’ai plus) ou **Stock cible** (quantité souhaitée)

### 🛍️ Liste de courses automatique
- Calcul automatique des quantités manquantes
- Total estimé avec couleurs (vert ≤ budget / rouge > budget)

### 💰 Budget
- Définition d’un budget maximum
- Affichage coloré du total (vert/rouge)

### 🏷️ Catégories
- 11 catégories prédéfinies (produits laitiers, entretien, viandes, surgelés, conserves, céréales, légumes frais, féculents, fruits frais, charcuterie, salle de bain)
- Ajout de catégories personnalisées
- Filtrage par catégorie

### 🔧 Barre d’actions (sticky)
- ➕ Créer un article (focus sur le champ)
- ✏️ Modifier le nom de l’article sélectionné
- 📋 Dupliquer l’article sélectionné
- 🔀 Réorganiser les articles (glisser-déposer)
- 💾 Sauvegarde manuelle

### 🌙 Mode nuit / clair
- Basculement automatique selon préférence système
- Bouton manuel 🌙/☀️

### 📱 Responsive
- Adapté aux mobiles, tablettes et desktop

### 💾 Stockage local
- Toutes les données restent dans votre navigateur
- Export/Import JSON (sauvegarde et transfert)

### 🚀 Progressive Web App (PWA)
- Installation sur mobile/desktop
- Fonctionne hors ligne
- Icône native avec emoji 🛒
- Écran de démarrage personnalisé

### 🧭 Navigation
- Bouton retour en haut (apparaît après défilement)

---

## 📸 Aperçu

| Mode clair | Mode nuit |
|------------|-----------|
| Interface bleu océan | Interface bleu nuit profond |

---

## 🛠️ Technologies

| Fichier | Rôle |
|---------|------|
| `index.html` | Structure, favicon emoji, balises PWA |
| `style.css` | Styles responsive, mode nuit, animations |
| `app.js` | Logique métier (Vanilla JS, aucune dépendance) |
| `manifest.json` | Configuration PWA (icônes, thème, orientation) |
| `sw.js` | Service Worker pour le hors ligne |
