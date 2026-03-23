import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const sizeOptions = () => [
  { groupName: 'Size', optionName: 'Small', priceModifier: -2 },
  { groupName: 'Size', optionName: 'Regular', priceModifier: 0 },
  { groupName: 'Size', optionName: 'Large', priceModifier: 3 },
];

const standardAddons = [
  { groupName: 'Add-ons', optionName: 'Extra Cheese', priceModifier: 1.5 },
  { groupName: 'Add-ons', optionName: 'Extra Sauce', priceModifier: 0.75 },
  { groupName: 'Add-ons', optionName: 'Side Salad', priceModifier: 3.5 },
];

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@restaurant.com' },
    update: {},
    create: {
      name: 'Kitchen Admin',
      email: 'admin@restaurant.com',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });

  const customerHash = await bcrypt.hash('customer123', 10);
  await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: customerHash,
      role: 'CUSTOMER',
      cart: { create: {} },
    },
  });

  const appetizers = await prisma.category.upsert({
    where: { name: 'Appetizers' },
    update: {},
    create: { name: 'Appetizers', description: 'Start your meal right', sortOrder: 1 },
  });
  const mains = await prisma.category.upsert({
    where: { name: 'Main Course' },
    update: {},
    create: { name: 'Main Course', description: 'Hearty main dishes', sortOrder: 2 },
  });
  const desserts = await prisma.category.upsert({
    where: { name: 'Desserts' },
    update: {},
    create: { name: 'Desserts', description: 'Sweet endings', sortOrder: 3 },
  });
  const beverages = await prisma.category.upsert({
    where: { name: 'Beverages' },
    update: {},
    create: { name: 'Beverages', description: 'Refreshing drinks', sortOrder: 4 },
  });

  await prisma.cartItem.deleteMany();
  await prisma.menuItemOption.deleteMany();
  await prisma.menuItem.deleteMany();

  const items: {
    categoryId: string;
    name: string;
    description: string;
    imageUrl: string;
    basePrice: number;
    prepTimeMinutes: number;
    stockQuantity: number;
    dietaryTags: string[];
    options: { groupName: string; optionName: string; priceModifier: number }[];
  }[] = [
    {
      categoryId: appetizers.id,
      name: 'Spring Rolls',
      description: 'Crispy vegetable spring rolls served with sweet chili sauce',
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947',
      basePrice: 8.99,
      prepTimeMinutes: 10,
      stockQuantity: 50,
      dietaryTags: ['vegetarian'],
      options: [
        { groupName: 'Size', optionName: 'Small (3 pcs)', priceModifier: -2 },
        { groupName: 'Size', optionName: 'Regular (5 pcs)', priceModifier: 0 },
        { groupName: 'Size', optionName: 'Large (8 pcs)', priceModifier: 3 },
        { groupName: 'Add-ons', optionName: 'Extra Dipping Sauce', priceModifier: 0.75 },
        ...standardAddons,
      ],
    },
    {
      categoryId: appetizers.id,
      name: 'Garlic Bread',
      description: 'Toasted baguette with garlic butter and herbs',
      imageUrl: 'https://images.unsplash.com/photo-1573140247632-f84664e67028',
      basePrice: 6.99,
      prepTimeMinutes: 8,
      stockQuantity: 60,
      dietaryTags: ['vegetarian'],
      options: [...sizeOptions(), ...standardAddons],
    },
    {
      categoryId: appetizers.id,
      name: 'Chicken Wings',
      description: 'Crispy wings tossed in your choice of house sauce',
      imageUrl: 'https://images.unsplash.com/photo-1527477394900-6d3d2e7b0c0b',
      basePrice: 12.99,
      prepTimeMinutes: 15,
      stockQuantity: 40,
      dietaryTags: [],
      options: [
        ...sizeOptions(),
        { groupName: 'Add-ons', optionName: 'Blue Cheese Dip', priceModifier: 1.25 },
        { groupName: 'Add-ons', optionName: 'Extra Sauce', priceModifier: 0.75 },
        { groupName: 'Add-ons', optionName: 'Side Celery', priceModifier: 1.0 },
      ],
    },
    {
      categoryId: appetizers.id,
      name: 'Bruschetta',
      description: 'Grilled bread topped with tomatoes, basil, and balsamic glaze',
      imageUrl: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f',
      basePrice: 9.49,
      prepTimeMinutes: 12,
      stockQuantity: 45,
      dietaryTags: ['vegetarian', 'vegan'],
      options: [...sizeOptions(), ...standardAddons],
    },
    {
      categoryId: mains.id,
      name: 'Grilled Salmon',
      description: 'Atlantic salmon with lemon butter and seasonal vegetables',
      imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
      basePrice: 24.99,
      prepTimeMinutes: 22,
      stockQuantity: 30,
      dietaryTags: ['gluten-free'],
      options: [
        ...sizeOptions(),
        { groupName: 'Add-ons', optionName: 'Extra Fillet', priceModifier: 8.0 },
        { groupName: 'Add-ons', optionName: 'Side Salad', priceModifier: 3.5 },
      ],
    },
    {
      categoryId: mains.id,
      name: 'Margherita Pizza',
      description: 'Classic pizza with mozzarella, tomato, and fresh basil',
      imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002',
      basePrice: 16.99,
      prepTimeMinutes: 18,
      stockQuantity: 35,
      dietaryTags: ['vegetarian'],
      options: [...sizeOptions(), ...standardAddons],
    },
    {
      categoryId: mains.id,
      name: 'Chicken Tikka Masala',
      description: 'Tender chicken in creamy tomato masala with basmati rice',
      imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641',
      basePrice: 18.99,
      prepTimeMinutes: 25,
      stockQuantity: 38,
      dietaryTags: [],
      options: [
        ...sizeOptions(),
        { groupName: 'Add-ons', optionName: 'Extra Naan', priceModifier: 2.5 },
        { groupName: 'Add-ons', optionName: 'Extra Rice', priceModifier: 2.0 },
        { groupName: 'Add-ons', optionName: 'Side Raita', priceModifier: 1.5 },
      ],
    },
    {
      categoryId: mains.id,
      name: 'Veggie Burger',
      description: 'House-made patty with avocado, lettuce, and chipotle mayo',
      imageUrl: 'https://images.unsplash.com/photo-1520072959219-c595dc870360',
      basePrice: 14.99,
      prepTimeMinutes: 16,
      stockQuantity: 42,
      dietaryTags: ['vegetarian', 'vegan'],
      options: [...sizeOptions(), ...standardAddons],
    },
    {
      categoryId: desserts.id,
      name: 'Tiramisu',
      description: 'Espresso-soaked ladyfingers with mascarpone cream',
      imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9',
      basePrice: 8.99,
      prepTimeMinutes: 5,
      stockQuantity: 25,
      dietaryTags: ['vegetarian'],
      options: [
        ...sizeOptions(),
        { groupName: 'Add-ons', optionName: 'Extra Cocoa Dust', priceModifier: 0 },
        { groupName: 'Add-ons', optionName: 'Espresso Shot', priceModifier: 1.5 },
      ],
    },
    {
      categoryId: desserts.id,
      name: 'Chocolate Lava Cake',
      description: 'Warm cake with a molten center and vanilla ice cream',
      imageUrl: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51',
      basePrice: 10.99,
      prepTimeMinutes: 12,
      stockQuantity: 20,
      dietaryTags: ['vegetarian'],
      options: [...sizeOptions(), ...standardAddons],
    },
    {
      categoryId: desserts.id,
      name: 'Mango Sorbet',
      description: 'Refreshing mango sorbet with mint garnish',
      imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb',
      basePrice: 7.49,
      prepTimeMinutes: 5,
      stockQuantity: 35,
      dietaryTags: ['vegan', 'gluten-free'],
      options: [...sizeOptions(), { groupName: 'Add-ons', optionName: 'Fresh Berries', priceModifier: 2.0 }],
    },
    {
      categoryId: desserts.id,
      name: 'Cheesecake',
      description: 'New York style cheesecake with berry compote',
      imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad',
      basePrice: 9.99,
      prepTimeMinutes: 5,
      stockQuantity: 28,
      dietaryTags: ['vegetarian'],
      options: [...sizeOptions(), ...standardAddons],
    },
    {
      categoryId: beverages.id,
      name: 'Fresh Lemonade',
      description: 'House-squeezed lemons with a touch of mint',
      imageUrl: 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e',
      basePrice: 4.99,
      prepTimeMinutes: 3,
      stockQuantity: 80,
      dietaryTags: ['vegan', 'gluten-free'],
      options: [...sizeOptions(), { groupName: 'Add-ons', optionName: 'Extra Mint', priceModifier: 0 }],
    },
    {
      categoryId: beverages.id,
      name: 'Cappuccino',
      description: 'Double espresso with steamed milk and microfoam',
      imageUrl: 'https://images.unsplash.com/photo-1572442388796-9c765a0c0c5b',
      basePrice: 5.49,
      prepTimeMinutes: 5,
      stockQuantity: 100,
      dietaryTags: ['vegetarian'],
      options: [
        ...sizeOptions(),
        { groupName: 'Add-ons', optionName: 'Extra Shot', priceModifier: 1.0 },
        { groupName: 'Add-ons', optionName: 'Oat Milk', priceModifier: 0.75 },
      ],
    },
    {
      categoryId: beverages.id,
      name: 'Mango Smoothie',
      description: 'Blended mango, yogurt, and honey',
      imageUrl: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4',
      basePrice: 6.99,
      prepTimeMinutes: 5,
      stockQuantity: 55,
      dietaryTags: ['vegetarian', 'vegan'],
      options: [...sizeOptions(), { groupName: 'Add-ons', optionName: 'Protein Boost', priceModifier: 1.5 }],
    },
    {
      categoryId: beverages.id,
      name: 'Iced Tea',
      description: 'Brewed black tea served chilled with lemon',
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc',
      basePrice: 3.99,
      prepTimeMinutes: 3,
      stockQuantity: 90,
      dietaryTags: ['vegan', 'gluten-free'],
      options: [...sizeOptions(), { groupName: 'Add-ons', optionName: 'Peach Syrup', priceModifier: 0.5 }],
    },
  ];

  for (const item of items) {
    await prisma.menuItem.create({
      data: {
        categoryId: item.categoryId,
        name: item.name,
        description: item.description,
        imageUrl: item.imageUrl,
        basePrice: item.basePrice,
        prepTimeMinutes: item.prepTimeMinutes,
        stockQuantity: item.stockQuantity,
        dietaryTags: item.dietaryTags,
        options: { create: item.options },
      },
    });
  }

  console.log('Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
