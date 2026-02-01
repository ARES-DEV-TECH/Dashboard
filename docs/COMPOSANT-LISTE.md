# Composant liste réutilisable (DataTable)

Le composant **DataTable** (`src/components/ui/data-table.tsx`) est le composant standard pour afficher une liste sous forme de tableau dans l’application (Clients, Articles, Charges).

## Fonctionnalités

- **Recherche** : champ de recherche qui filtre sur toutes les colonnes
- **Tri** : clic sur l’en-tête des colonnes marquées `sortable: true`
- **Pagination** : pagination classique (page 1, 2, 3…) ou **virtualisation** au-delà de 200 lignes (scroll fluide)
- **Actions** : boutons Nouveau, Exporter, Importer (optionnels) ; par ligne : Modifier, Supprimer ; pour les ventes : Devis, Facture

## Pattern d’utilisation

1. **Données** : charger la liste avec SWR (ex. `useSWR(SWR_KEYS.clients, fetchClients)`).
2. **Colonnes** : définir un tableau `Column<T>[]` avec `key`, `label`, optionnellement `render`, `sortable`.
3. **DataTable** : passer `data`, `columns`, et les callbacks `onAdd`, `onEdit`, `onDelete`, `onExport`, etc.
4. **Création / édition** : gérer dans un Dialog ou Modal (formulaire) à côté du tableau.

Exemple minimal :

```tsx
const { data: items = [], mutate } = useSWR(SWR_KEYS.xxx, fetchXxx, { ... })
const columns: Column<Item>[] = [
  { key: 'name', label: 'Nom', sortable: true },
  { key: 'amount', label: 'Montant', sortable: true },
]
return (
  <DataTable
    data={items}
    columns={columns}
    onAdd={handleAdd}
    onEdit={handleEdit}
    onDelete={handleDelete}
    onExport={handleExport}
    searchPlaceholder="Rechercher..."
    virtualized
  />
)
```

## Où c’est utilisé

| Page   | Composant        | Remarque                          |
|--------|------------------|-----------------------------------|
| Clients | `ClientsContent` | DataTable + Dialog CRUD           |
| Articles | `ArticlesContent` | DataTable + Dialog CRUD + options service |
| Charges | `ChargesContent` | DataTable + ChargeFormModal       |
| Ventes | `SalesContent`   | Liste en cartes (pas DataTable)   |

Pour toute nouvelle liste (tableau avec recherche / tri / actions), utiliser **DataTable** pour garder le même comportement et la même UX que Clients, Articles et Charges.
