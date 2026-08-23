import { createContext, useContext, useEffect, useState } from "react";

const FavoritesContext = createContext(null);
const STORAGE_KEY = "tienda_favoritos";

export const FavoritesProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const isFavorite = (id) => items.some((it) => it.id === id);

  const toggleFavorite = (producto) => {
    setItems((prev) => {
      if (prev.some((it) => it.id === producto.id)) {
        return prev.filter((it) => it.id !== producto.id);
      }
      return [
        ...prev,
        {
          id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          descuento: producto.descuento,
          imagen: producto.imagen,
          categoria: producto.categoria,
          codigo: producto.codigo,
          stock: producto.stock,
        },
      ];
    });
  };

  return (
    <FavoritesContext.Provider value={{ items, isFavorite, toggleFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites debe usarse dentro de FavoritesProvider");
  return ctx;
};
