export function useCart() {
  return {
    addItem: (product) => {
      console.log('Ops Preview added item:', product);
    },
    cart: [],
    totalPrice: 0
  };
}
