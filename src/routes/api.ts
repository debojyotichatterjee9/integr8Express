import express, { Router, Request, Response } from 'express';
import { CRUDController } from '../controllers/crudController';
import { DataSeeder } from '../utils/seeder';
// import Person from '../models/Person';
// import Airline from '../models/Airline';
// import Finance from '../models/Finance';
// import Book from '../models/Book';
// import Commerce from '../models/Commerce';
// import Company from '../models/Company';
// import Location from '../models/Location';
// import { winstonLogger } from '../utils/logger';

const router: Router = express.Router();

// /**
//  * Initialize CRUD controllers for each model
//  */
// const personController = new CRUDController(Person, 'Person');
// const airlineController = new CRUDController(Airline, 'Airline');
// const financeController = new CRUDController(Finance, 'Finance');
// const bookController = new CRUDController(Book, 'Book');
// const commerceController = new CRUDController(Commerce, 'Commerce');
// const companyController = new CRUDController(Company, 'Company');
// const locationController = new CRUDController(Location, 'Location');

// /**
//  * Person Routes
//  */
// router.post('/persons', personController.create);
// router.get('/persons', personController.getAll);
// router.get('/persons/count', personController.count);
// router.get('/persons/:id', personController.getById);
// router.put('/persons/:id', personController.update);
// router.delete('/persons/:id', personController.delete);

// /**
//  * Airline Routes
//  */
// router.post('/airlines', airlineController.create);
// router.get('/airlines', airlineController.getAll);
// router.get('/airlines/count', airlineController.count);
// router.get('/airlines/:id', airlineController.getById);
// router.put('/airlines/:id', airlineController.update);
// router.delete('/airlines/:id', airlineController.delete);

// /**
//  * Finance Routes
//  */
// router.post('/finances', financeController.create);
// router.get('/finances', financeController.getAll);
// router.get('/finances/count', financeController.count);
// router.get('/finances/:id', financeController.getById);
// router.put('/finances/:id', financeController.update);
// router.delete('/finances/:id', financeController.delete);

// /**
//  * Book Routes
//  */
// router.post('/books', bookController.create);
// router.get('/books', bookController.getAll);
// router.get('/books/count', bookController.count);
// router.get('/books/:id', bookController.getById);
// router.put('/books/:id', bookController.update);
// router.delete('/books/:id', bookController.delete);

// /**
//  * Commerce Routes
//  */
// router.post('/commerce', commerceController.create);
// router.get('/commerce', commerceController.getAll);
// router.get('/commerce/count', commerceController.count);
// router.get('/commerce/:id', commerceController.getById);
// router.put('/commerce/:id', commerceController.update);
// router.delete('/commerce/:id', commerceController.delete);

// /**
//  * Company Routes
//  */
// router.post('/companies', companyController.create);
// router.get('/companies', companyController.getAll);
// router.get('/companies/count', companyController.count);
// router.get('/companies/:id', companyController.getById);
// router.put('/companies/:id', companyController.update);
// router.delete('/companies/:id', companyController.delete);

// /**
//  * Location Routes
//  */
// router.post('/locations', locationController.create);
// router.get('/locations', locationController.getAll);
// router.get('/locations/count', locationController.count);
// router.get('/locations/:id', locationController.getById);
// router.put('/locations/:id', locationController.update);
// router.delete('/locations/:id', locationController.delete);

// /**
//  * Data Seeding Routes
//  */

// /**
//  * Seed all collections with 50 records each
//  * POST /api/seed/all
//  */
// router.post('/seed/all', async (req: Request, res: Response) => {
//   try {
//     const count = parseInt(req.body.count as string) || 50;

//     winstonLogger.info(`Starting seed process for all collections with ${count} records each`);

//     const result = await DataSeeder.seedAll(count);

//     res.status(201).json({
//       success: true,
//       message: `Successfully seeded all collections with ${count} records each`,
//       data: result
//     });
//   } catch (error: any) {
//     winstonLogger.error('Error seeding all collections:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error seeding collections',
//       error: error.message
//     });
//   }
// });

// /**
//  * Seed specific collection
//  * POST /api/seed/:collection
//  */
// router.post('/seed/:collection', async (req: Request, res: Response) => {
//   try {
//     const collection = req.params.collection.toLowerCase();
//     const count = parseInt(req.body.count as string) || 50;

//     let result: number;

//     switch (collection) {
//       case 'persons':
//         result = await DataSeeder.seedPersons(count);
//         break;
//       case 'airlines':
//         result = await DataSeeder.seedAirlines(count);
//         break;
//       case 'finances':
//         result = await DataSeeder.seedFinances(count);
//         break;
//       case 'books':
//         result = await DataSeeder.seedBooks(count);
//         break;
//       case 'commerce':
//         result = await DataSeeder.seedCommerce(count);
//         break;
//       case 'companies':
//         result = await DataSeeder.seedCompanies(count);
//         break;
//       case 'locations':
//         result = await DataSeeder.seedLocations(count);
//         break;
//       default:
//         res.status(400).json({
//           success: false,
//           message: `Invalid collection: ${collection}`,
//           validCollections: ['persons', 'airlines', 'finances', 'books', 'commerce', 'companies', 'locations']
//         });
//         return;
//     }

//     res.status(201).json({
//       success: true,
//       message: `Successfully seeded ${result} records in ${collection}`,
//       count: result
//     });
//   } catch (error: any) {
//     winstonLogger.error(`Error seeding ${req.params.collection}:`, error);
//     res.status(500).json({
//       success: false,
//       message: `Error seeding ${req.params.collection}`,
//       error: error.message
//     });
//   }
// });

// /**
//  * Clear all collections
//  * DELETE /api/seed/all
//  */
// router.delete('/seed/all', async (req: Request, res: Response) => {
//   try {
//     winstonLogger.info('Clearing all collections');

//     await DataSeeder.clearAll();

//     res.status(200).json({
//       success: true,
//       message: 'Successfully cleared all collections'
//     });
//   } catch (error: any) {
//     winstonLogger.error('Error clearing collections:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error clearing collections',
//       error: error.message
//     });
//   }
// });

// /**
//  * Get database statistics
//  * GET /api/stats
//  */
// router.get('/stats', async (req: Request, res: Response) => {
//   try {
//     const [
//       personsCount,
//       airlinesCount,
//       financesCount,
//       booksCount,
//       commerceCount,
//       companiesCount,
//       locationsCount
//     ] = await Promise.all([
//       Person.countDocuments(),
//       Airline.countDocuments(),
//       Finance.countDocuments(),
//       Book.countDocuments(),
//       Commerce.countDocuments(),
//       Company.countDocuments(),
//       Location.countDocuments()
//     ]);

//     const total = personsCount + airlinesCount + financesCount + booksCount +
//       commerceCount + companiesCount + locationsCount;

//     res.status(200).json({
//       success: true,
//       data: {
//         persons: personsCount,
//         airlines: airlinesCount,
//         finances: financesCount,
//         books: booksCount,
//         commerce: commerceCount,
//         companies: companiesCount,
//         locations: locationsCount,
//         total
//       }
//     });
//   } catch (error: any) {
//     winstonLogger.error('Error getting database statistics:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Error retrieving statistics',
//       error: error.message
//     });
//   }
// });

export default router;