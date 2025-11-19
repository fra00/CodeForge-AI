import React from 'react';
import PropTypes from 'prop-types';
import { useProductStore } from '../../store/useProductStore';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Box from '../../components/ui/Box';

const getStatusVariant = (status) => {
  switch (status) {
    case 'Available':
      return 'primary';
    case 'Low Stock':
      return 'warning';
    case 'Discontinued':
      return 'danger';
    default:
      return 'default';
  }
};

const ProductTable = ({ onEdit }) => {
  const products = useProductStore((state) => state.products);
  const deleteProduct = useProductStore((state) => state.deleteProduct);

  const columns = [
    { key: 'name', header: 'Nome' },
    { key: 'category', header: 'Categoria' },
    { 
      key: 'price', 
      header: 'Prezzo',
      render: (product) => `€ ${product.price.toFixed(2)}`
    },
    { 
      key: 'stock', 
      header: 'Stock',
      render: (product) => (
        <Badge variant={product.stock < 10 ? 'danger' : 'default'}>
          {product.stock}
        </Badge>
      )
    },
    { 
      key: 'status', 
      header: 'Stato',
      render: (product) => (
        <Badge variant={getStatusVariant(product.status)}>
          {product.status}
        </Badge>
      )
    },
    { 
      key: 'actions', 
      header: 'Azioni',
      render: (product) => (
        <Box className="flex space-x-2">
          <Button size="small" variant="secondary" onClick={() => onEdit(product)}>
            Modifica
          </Button>
          <Button size="small" variant="danger" onClick={() => deleteProduct(product.id)}>
            Elimina
          </Button>
        </Box>
      )
    },
  ];

  if (products.length === 0) {
    return <p className="p-4 text-center">Nessun prodotto trovato. Aggiungine uno per iniziare.</p>;
  }

  return (
    <Table columns={columns} data={products} />
  );
};

ProductTable.propTypes = {
  onEdit: PropTypes.func.isRequired,
};

export default ProductTable;