import React from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, useProductStore } from '../../store/useProductStore';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import CardHeader from '../../components/ui/CardHeader';
import CardFooter from '../../components/ui/CardFooter';

// Extracting category options from the Zod schema for the Select component
const categoryOptions = productSchema.shape.category.options.map(value => ({
  value,
  label: value,
}));

const ProductForm = ({ defaultValues, isEditing, onClose }) => {
  const addProduct = useProductStore((state) => state.addProduct);
  const updateProduct = useProductStore((state) => state.updateProduct);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: defaultValues || {
      name: '',
      price: 0,
      stock: 0,
      category: categoryOptions[0].value,
    },
  });

  const onSubmit = (data) => {
    try {
      // Zod validation already happened, but we ensure price and stock are numbers
      const submissionData = {
        ...data,
        price: parseFloat(data.price),
        stock: parseInt(data.stock, 10),
      };

      if (isEditing) {
        updateProduct(submissionData.id, submissionData);
      } else {
        addProduct(submissionData);
      }
      
      reset();
      onClose();
    } catch (error) {
      console.error("Form submission error:", error);
      // Handle potential runtime errors if Zod validation was bypassed (unlikely with zodResolver)
    }
  };

  return (
    <Card>
      <CardHeader>{isEditing ? 'Modifica Prodotto' : 'Aggiungi Nuovo Prodotto'}</CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
        <Input
          id="name"
          label="Nome Prodotto"
          type="text"
          {...register('name')}
          error={errors.name?.message}
        />
        <Input
          id="price"
          label="Prezzo (€)"
          type="number"
          step="0.01"
          {...register('price', { valueAsNumber: true })}
          error={errors.price?.message}
        />
        <Input
          id="stock"
          label="Stock Disponibile"
          type="number"
          {...register('stock', { valueAsNumber: true })}
          error={errors.stock?.message}
        />
        <Select
          id="category"
          label="Categoria"
          options={categoryOptions}
          {...register('category')}
          error={errors.category?.message}
        />
        
        <CardFooter className="flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annulla
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isEditing ? 'Salva Modifiche' : 'Aggiungi Prodotto'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

ProductForm.propTypes = {
  defaultValues: PropTypes.object,
  isEditing: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
};

ProductForm.defaultProps = {
  defaultValues: null,
  isEditing: false,
};

export default ProductForm;