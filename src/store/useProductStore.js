import { create } from 'zustand';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// 1. Zod Schema Definition
// Defines the structure and validation rules for a Product
export const productSchema = z.object({
  id: z.string().uuid().default(() => uuidv4()),
  name: z.string().min(3, "Il nome deve contenere almeno 3 caratteri."),
  price: z.number().min(0.01, "Il prezzo deve essere maggiore di zero."),
  stock: z.number().int().min(0, "La quantità in stock non può essere negativa."),
  category: z.enum(["Electronics", "Clothing", "Books", "Other"], {
    required_error: "La categoria è obbligatoria.",
    invalid_type_error: "Categoria non valida.",
  }),
  status: z.enum(["Available", "Discontinued", "Low Stock"]).default("Available"),
});

// Infer the TypeScript type from the Zod schema (for documentation/clarity)
// Note: Since this is a JS project, this is for conceptual clarity.
// type Product = z.infer<typeof productSchema>;

// 2. Zustand Store Definition
const initialProducts = [
  { id: uuidv4(), name: "Laptop Pro X", price: 1200.00, stock: 15, category: "Electronics", status: "Available" },
  { id: uuidv4(), name: "T-Shirt Basic", price: 25.50, stock: 50, category: "Clothing", status: "Available" },
  { id: uuidv4(), name: "The Great Novel", price: 15.99, stock: 5, category: "Books", status: "Low Stock" },
];

export const useProductStore = create((set) => ({
  products: initialProducts,
  
  addProduct: (productData) => set((state) => {
    // Ensure productData conforms to the schema and has an ID
    const newProduct = productSchema.parse(productData);
    return { products: [...state.products, newProduct] };
  }),

  updateProduct: (id, updatedData) => set((state) => ({
    products: state.products.map(product => 
      product.id === id ? { ...product, ...updatedData } : product
    ),
  })),

  deleteProduct: (id) => set((state) => ({
    products: state.products.filter(product => product.id !== id),
  })),
}));