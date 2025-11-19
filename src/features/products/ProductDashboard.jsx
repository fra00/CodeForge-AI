import React, { useState } from 'react';
import ProductTable from './ProductTable';
import ProductForm from './ProductForm';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import useDisclosure from '../../components/ui/useDisclosure';
import Box from '../../components/ui/Box';

const ProductDashboard = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editingProduct, setEditingProduct] = useState(null);

  const handleOpenModal = (product = null) => {
    setEditingProduct(product);
    onOpen();
  };

  const handleCloseModal = () => {
    setEditingProduct(null);
    onClose();
  };

  return (
    <Box className="p-6">
      <Box className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestione Prodotti</h1>
        <Button onClick={() => handleOpenModal(null)}>
          Aggiungi Prodotto
        </Button>
      </Box>

      <ProductTable onEdit={handleOpenModal} />

      <Modal 
        isOpen={isOpen} 
        onClose={handleCloseModal} 
        title={editingProduct ? "Modifica Prodotto" : "Aggiungi Prodotto"}
      >
        <ProductForm 
          defaultValues={editingProduct}
          isEditing={!!editingProduct}
          onClose={handleCloseModal}
        />
      </Modal>
    </Box>
  );
};

export default ProductDashboard;