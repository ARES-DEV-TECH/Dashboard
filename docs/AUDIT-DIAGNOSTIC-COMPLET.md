# Diagnostic du projet ARES Dashboard (en mots simples)

**Date :** 30 janvier 2025  
**But :** Dire clairement ce qui marche, ce qui ne marche pas, et ce qu’on peut améliorer.

---

## En résumé

- **Une partie marche bien** : connexion, inscription, menu, tableau de bord, clients, charges.
- **Il y a des bugs importants** : certaines pages montrent les données de tout le monde au lieu de seulement les tiennes, et le calcul de la TVA peut être faux quand tu enregistres une vente.
- **On peut améliorer** : les messages d’erreur, la sécurité, et rendre le code plus clair.

---

## 1. Ce qui fonctionne bien

### Connexion et inscription

- Tu peux te connecter avec ton email et mot de passe.
- Tu peux t’inscrire et créer un compte.
- Le site se souvient de toi (cookie) et te redirige vers le tableau de bord.
- La déconnexion fonctionne.

### L’écran et le menu

- Sur téléphone : un menu qui s’ouvre en cliquant sur l’icône.
- Sur ordinateur : un menu fixe à gauche.
- Les couleurs et le style sont cohérents (sauf la page d’inscription, voir plus bas).

### Tableau de bord

- Les chiffres (CA, charges, résultat, etc.) s’affichent.
- Tu peux changer la période (mois, trimestre, année).
- Tu peux comparer avec la période précédente.
- Les graphiques et les listes se chargent correctement.

### Clients

- Tu vois **uniquement tes clients**.
- Tu peux en ajouter, modifier, supprimer.
- L’export en CSV fonctionne.

### Charges

- Tu vois **uniquement tes charges**.
- Tu peux en ajouter, modifier, supprimer.
- L’export en CSV fonctionne.

### Technique (pour les devs)

- La base de données (Prisma), les validations (Zod), les dates, l’export CSV, la config Next/Electron sont en place et cohérents.

---

## 2. Ce qui ne fonctionne pas (bugs)

### Bug 1 : La liste des articles / services montre ceux de tout le monde

- **Où :** Page ou liste des articles (services que tu vends).
- **Problème :** Le code ne filtre pas par « qui est connecté ». Donc quand tu demandes la liste des articles, tu reçois **tous les articles de tous les utilisateurs** (les tiens + ceux des autres).
- **En clair :** Un utilisateur peut voir les noms de services et les prix des autres. Il faut que le site ne renvoie que **tes** articles.

### Bug 2 : La page Paramètres montre les paramètres de tout le monde

- **Où :** Données utilisées pour afficher ou utiliser les paramètres (TVA, URSSAF, nom d’entreprise, etc.).
- **Problème :** Le code récupère bien qui est connecté, mais quand il charge les paramètres, il ne filtre pas. Il charge **tous les paramètres de tous les utilisateurs**.
- **En clair :** Tu pourrais voir (ou le site pourrait utiliser) le taux de TVA ou le nom d’entreprise d’un autre. Il faut que le site ne charge que **tes** paramètres.

### Bug 3 : Quand tu changes le taux de TVA dans Paramètres, le site modifie toutes les ventes

- **Où :** Paramètres → changement du taux de TVA.
- **Problème :** Le code recalcule les montants des ventes pour appliquer le nouveau taux, mais il le fait sur **toutes les ventes de tout le monde**, pas seulement les tiennes.
- **En clair :** Les ventes des autres utilisateurs peuvent être modifiées par erreur. Il faut ne mettre à jour que **tes** ventes.

### Bug 4 : Le calcul de la TVA peut être faux quand tu enregistres une vente

- **Où :** Quand tu ajoutes ou modifies une vente (facture).
- **Problème :** Pour calculer la TVA, le code du serveur appelle une autre partie du site qui va chercher les paramètres (dont le taux de TVA). Mais depuis le serveur, cette deuxième requête part **sans ton cookie de connexion**. Du coup soit ça échoue (et un taux par défaut est peut-être utilisé), soit ça prend les mauvaises infos. Le montant TVA et le total TTC de la vente peuvent donc être **incorrects**.
- **En clair :** Quand tu enregistres une vente, le site devrait utiliser **ton** taux de TVA. Aujourd’hui, à cause de la façon dont c’est codé, ce n’est pas garanti. Il faut que le serveur lise ton taux de TVA directement en base (en sachant qui tu es) et qu’il le passe au calcul, au lieu d’aller refaire un appel « comme si c’était le navigateur ».

---

## 3. Ce qu’on peut améliorer (sans être cassé)

### Messages d’erreur

- Aujourd’hui : souvent une petite fenêtre type **alert()** (par ex. « Erreur lors de la sauvegarde »).
- Mieux : afficher le message dans la page (sous le formulaire ou en haut), ou utiliser des « toasts » (petite notification qui disparaît). Ce sera plus propre et plus lisible.

### Page d’inscription

- Les couleurs sont écrites en dur dans le code (par ex. fond #0a0a0a, bleu #667eea). Sur la page de connexion, le site utilise plutôt les couleurs du thème (variables CSS / Tailwind).  
- Mieux : utiliser les mêmes principes que la page de connexion pour que tout reste cohérent si tu changes le thème plus tard.

### Sécurité en production

- Le « secret » qui sert à signer les jetons de connexion peut encore être remplacé par une valeur par défaut si la variable d’environnement n’est pas définie.  
- Mieux : en production, exiger que ce secret soit toujours défini dans la config (variable d’environnement), et ne jamais utiliser la valeur par défaut.

### Ventes : typage du code

- Les listes de ventes, clients, articles sont parfois typées « any » (n’importe quoi).  
- Mieux : donner des types précis (Vente, Client, Article) pour éviter les erreurs et rendre le code plus clair.

### Résumé des corrections à faire en priorité

1. **Articles** : ne renvoyer que les articles de la personne connectée.
2. **Paramètres (lecture)** : ne charger que les paramètres de la personne connectée.
3. **Paramètres (changement TVA)** : ne recalculer que les ventes de la personne connectée.
4. **Ventes (création / modification)** : que le serveur lise le taux de TVA de la personne connectée en base et le passe au calcul, au lieu d’appeler la page des paramètres depuis le serveur.

---

## 4. Tableau récapitulatif (simplifié)

| Partie du site | Ça marche ? | Problème principal |
|----------------|-------------|---------------------|
| Connexion / Inscription / Déconnexion | Oui | - |
| Menu (mobile + desktop) | Oui | - |
| Tableau de bord | Oui | - |
| Clients | Oui | - |
| Charges | Oui | - |
| **Liste des articles** | **Non** | Montre les articles de tout le monde |
| **Paramètres (affichage / utilisation)** | **Non** | Charge les paramètres de tout le monde |
| **Paramètres (changer la TVA)** | **Partiel** | Modifie les ventes de tout le monde |
| **Enregistrer une vente** | **Risque** | La TVA peut être calculée avec le mauvais taux |
| Page d’inscription | Oui | Styles en dur, à harmoniser |
| Messages d’erreur | Oui mais basique | Remplacer les alert() par des messages dans la page ou des toasts |

---

## 5. Conclusion en une phrase

**Ce qui va bien :** connexion, menu, tableau de bord, clients et charges sont corrects et chaque utilisateur devrait déjà ne voir que ses clients et ses charges.  
**Ce qu’il faut corriger en priorité :** s’assurer que les articles, les paramètres et les ventes ne concernent **que** la personne connectée (filtrage partout par « utilisateur »), et que le calcul de la TVA lors de l’enregistrement d’une vente utilise **son** taux, lu directement en base côté serveur.
