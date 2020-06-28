import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found');
    }

    const foundProducts = await this.productsRepository.findAllById(products);

    const orderedProducts = products.map(recivedProduct => {
      const product = foundProducts.find(
        foundProduct => foundProduct.id === recivedProduct.id,
      );

      if (!product) {
        throw new AppError(
          `O id ${recivedProduct.id} não foi encontrado no cadastro de produtos`,
        );
      }

      if (product.quantity < recivedProduct.quantity) {
        throw new AppError(
          `Não há estoque suficiente para um ou mais produtos`,
        );
      }

      return {
        product_id: recivedProduct.id,
        price: product.price,
        quantity: recivedProduct.quantity,
      };
    });

    const order = this.ordersRepository.create({
      customer,
      products: orderedProducts,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
