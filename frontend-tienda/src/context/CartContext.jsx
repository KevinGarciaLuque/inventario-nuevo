import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getImgSrc } from "../utils/img.js";

const CartContext = createContext(null);
const STORAGE_KEY = "tienda_carrito";

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // ===== Animación "volar al carrito" =====
  const cartIconRef = useRef(null);
  const [flights, setFlights] = useState([]);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (producto, cantidad = 1) => {
    setItems((prev) => {
      const existe = prev.find((it) => it.id === producto.id);
      if (existe) {
        return prev.map((it) =>
          it.id === producto.id
            ? { ...it, cantidad: it.cantidad + cantidad }
            : it,
        );
      }
      return [
        ...prev,
        {
          id: producto.id,
          nombre: producto.nombre,
          precio: Number(producto.precio),
          imagen: producto.imagen,
          codigo: producto.codigo,
          cantidad,
        },
      ];
    });
  };

  // Dispara la animación del producto volando hacia el carrito
  const flyToCart = useCallback((originEl, imagen) => {
    const target = cartIconRef.current;
    if (!originEl || !target || typeof originEl.getBoundingClientRect !== "function") {
      return;
    }

    const o = originEl.getBoundingClientRect();
    const t = target.getBoundingClientRect();

    // Si el usuario prefiere menos movimiento, no animamos
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const size = Math.min(90, Math.max(52, o.width * 0.45));

    const flight = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      img: getImgSrc(imagen),
      start: {
        x: o.left + o.width / 2 - size / 2,
        y: o.top + o.height / 2 - size / 2,
      },
      end: {
        x: t.left + t.width / 2 - size / 2,
        y: t.top + t.height / 2 - size / 2,
      },
      size,
    };

    setFlights((prev) => [...prev, flight]);
  }, []);

  const finishFlight = useCallback((id) => {
    setFlights((prev) => prev.filter((f) => f.id !== id));
    setBump((b) => b + 1);
  }, []);

  const removeItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const updateQty = (id, cantidad) => {
    if (cantidad <= 0) return removeItem(id);
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, cantidad } : it)),
    );
  };

  const clear = () => setItems([]);

  const totalItems = useMemo(
    () => items.reduce((sum, it) => sum + it.cantidad, 0),
    [items],
  );

  const totalPrecio = useMemo(
    () => items.reduce((sum, it) => sum + it.precio * it.cantidad, 0),
    [items],
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQty,
        clear,
        totalItems,
        totalPrecio,
        cartIconRef,
        flyToCart,
        bump,
      }}
    >
      {children}

      {/* Capa de animación: producto volando al carrito */}
      <div className="fly-to-cart-layer" aria-hidden="true">
        <AnimatePresence>
          {flights.map((f) => (
            <motion.img
              key={f.id}
              src={f.img}
              alt=""
              className="fly-to-cart-item"
              initial={{
                x: f.start.x,
                y: f.start.y,
                scale: 1,
                opacity: 0,
                rotate: -8,
              }}
              animate={{
                x: [f.start.x, (f.start.x + f.end.x) / 2, f.end.x],
                y: [
                  f.start.y,
                  Math.min(f.start.y, f.end.y) - 140,
                  f.end.y,
                ],
                scale: [1, 0.9, 0.15],
                opacity: [1, 1, 0.35],
                rotate: [-8, 6, 24],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.85,
                ease: [0.4, 0, 0.2, 1],
                times: [0, 0.55, 1],
              }}
              style={{ width: f.size, height: f.size }}
              onAnimationComplete={() => finishFlight(f.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
};
