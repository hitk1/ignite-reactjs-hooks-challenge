import { useEffect } from 'react';
import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      console.log('encontrou item', JSON.parse(storagedCart))
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const syncLocalStorage = (data: Product[]) => {
    localStorage.setItem('@RocketShoes:cart', JSON.stringify(data))
  }

  const addProduct = async (productId: number) => {
    try {
      const foundProduct = cart.find(product => product.id === productId)

      if (foundProduct) {
        const { data } = await api.get(`/stock/${productId}`)
        const { amount } = data as { id: number, amount: number }

        if (foundProduct.amount + 1 > amount) {
          toast.error('Quantidade solicitada fora de estoque')
          return
        }

        foundProduct.amount++

        setCart(oldValue => {
          oldValue.splice(
            cart.findIndex(product => product.id === productId),
            1,
            foundProduct
          )
          const newState = oldValue.slice()
          syncLocalStorage(newState)
          return newState
        })

      } else {
        const { data } = await api.get(`/products/${productId}`)

        setCart(oldValues => {
          const newState = [
            ...oldValues,
            {
              ...data,
              amount: 1
            }
          ]

          syncLocalStorage(newState)
          return newState
        })
      }

    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {

      const productIndex = cart.findIndex(product => product.id === productId)
      if (productIndex === -1)
        throw new Error()

      setCart(oldValues => {
        oldValues.splice(
          oldValues.findIndex(product => product.id === productId),
          1
        )

        const newState = oldValues.slice()
        syncLocalStorage(newState)
        return newState
      })

    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if (amount <= 0)
        return

      const { data } = await api.get(`/stock/${productId}`)
      const { amount: stockAmount } = data as { id: number, amount: number }

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const foundProduct = cart.find(product => product.id === productId)
      if (!foundProduct)
        throw new Error()

      setCart(oldValues => {
        oldValues.splice(
          oldValues.findIndex(product => product.id === productId),
          1,
          {
            ...foundProduct!,
            amount
          }
        )

        const newState = oldValues.slice()
        syncLocalStorage(newState)
        return newState
      })


    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
