import { faker } from '@faker-js/faker';
import { winstonLogger } from '../utils/winston';
// import Person from '../models/Person';
// import Airline from '../models/Airline';
// import Finance from '../models/Finance';
// import Book from '../models/Book';
// import Commerce from '../models/Commerce';
// import Company from '../models/Company';
// import Location from '../models/Location';

/**
 * Data Seeder Service
 * Generates fake data using Faker.js for all models
 */

export class DataSeeder {

  // /**
  //  * Generate Person data
  //  */
  // private static generatePerson() {
  //   const sex = faker.person.sex() as 'male' | 'female';
  //   const firstName = faker.person.firstName(sex);
  //   const lastName = faker.person.lastName();
  //   const middleName = faker.person.middleName();

  //   return {
  //     bio: faker.person.bio(),
  //     firstName,
  //     fullName: faker.person.fullName({ firstName, lastName }),
  //     gender: faker.person.gender(),
  //     jobArea: faker.person.jobArea(),
  //     jobDescriptor: faker.person.jobDescriptor(),
  //     jobTitle: faker.person.jobTitle(),
  //     jobType: faker.person.jobType(),
  //     lastName,
  //     middleName,
  //     prefix: faker.person.prefix(),
  //     sex,
  //     sexType: faker.person.sexType(),
  //     suffix: faker.person.suffix(),
  //     zodiacSign: faker.person.zodiacSign()
  //   };
  // }

  // /**
  //  * Generate Airline data
  //  */
  // private static generateAirline() {
  //   return {
  //     aircraftType: faker.airline.aircraftType(),
  //     airline: faker.airline.airline().name,
  //     airplane: faker.airline.airplane().name,
  //     airport: faker.airline.airport().name,
  //     flightNumber: faker.airline.flightNumber({ addLeadingZeros: true }),
  //     recordLocator: faker.airline.recordLocator(),
  //     seat: faker.airline.seat()
  //   };
  // }

  // /**
  //  * Generate Finance data
  //  */
  // private static generateFinance() {
  //   const currency = faker.finance.currency();

  //   return {
  //     accountName: faker.finance.accountName(),
  //     accountNumber: faker.finance.accountNumber(),
  //     amount: parseFloat(faker.finance.amount()),
  //     bic: faker.finance.bic(),
  //     cryptoAddresses: {
  //       bitcoin: faker.finance.bitcoinAddress(),
  //       ethereum: faker.finance.ethereumAddress(),
  //       litecoin: faker.finance.litecoinAddress()
  //     },
  //     creditCard: {
  //       number: faker.finance.creditCardNumber(),
  //       cvv: faker.finance.creditCardCVV(),
  //       issuer: faker.finance.creditCardIssuer()
  //     },
  //     currency: {
  //       code: currency.code,
  //       name: currency.name,
  //       numericCode: faker.string.numeric(3),
  //       symbol: currency.symbol
  //     },
  //     iban: faker.finance.iban(),
  //     pin: faker.finance.pin(),
  //     routingNumber: faker.finance.routingNumber(),
  //     transactionDescription: faker.finance.transactionDescription(),
  //     transactionType: faker.helpers.arrayElement(['deposit', 'withdrawal', 'payment', 'invoice', 'transfer'])
  //   };
  // }

  // /**
  //  * Generate Book data
  //  */
  // private static generateBook() {
  //   return {
  //     author: faker.book.author(),
  //     format: faker.helpers.arrayElement(['Hardcover', 'Paperback', 'E-book', 'Audiobook']),
  //     genre: faker.book.genre(),
  //     publisher: faker.book.publisher(),
  //     series: faker.helpers.maybe(() => faker.book.series(), { probability: 0.5 }),
  //     title: faker.book.title()
  //   };
  // }

  // /**
  //  * Generate Commerce data
  //  */
  // private static generateCommerce() {
  //   const productName = faker.commerce.productName();

  //   return {
  //     department: faker.commerce.department(),
  //     isbn: faker.commerce.isbn(),
  //     price: parseFloat(faker.commerce.price()),
  //     product: faker.commerce.product(),
  //     productDetails: {
  //       adjective: faker.commerce.productAdjective(),
  //       description: faker.commerce.productDescription(),
  //       material: faker.commerce.productMaterial(),
  //       name: productName
  //     }
  //   };
  // }

  // /**
  //  * Generate Company data
  //  */
  // private static generateCompany() {
  //   return {
  //     buzzPhrase: {
  //       adjective: faker.company.buzzAdjective(),
  //       noun: faker.company.buzzNoun(),
  //       phrase: faker.company.buzzPhrase(),
  //       verb: faker.company.buzzVerb()
  //     },
  //     catchPhrase: {
  //       adjective: faker.company.catchPhraseAdjective(),
  //       descriptor: faker.company.catchPhraseDescriptor(),
  //       noun: faker.company.catchPhraseNoun(),
  //       phrase: faker.company.catchPhrase()
  //     },
  //     name: faker.company.name()
  //   };
  // }

  // /**
  //  * Generate Location data
  //  */
  // private static generateLocation() {
  //   const latitude = parseFloat(faker.location.latitude());
  //   const longitude = parseFloat(faker.location.longitude());

  //   return {
  //     address: {
  //       buildingNumber: faker.location.buildingNumber(),
  //       street: faker.location.street(),
  //       streetAddress: faker.location.streetAddress(),
  //       secondaryAddress: faker.helpers.maybe(() => faker.location.secondaryAddress(), { probability: 0.3 })
  //     },
  //     cardinalDirection: faker.helpers.arrayElement(['N', 'S', 'E', 'W']),
  //     city: faker.location.city(),
  //     continent: faker.helpers.arrayElement(['Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America']),
  //     coordinates: {
  //       latitude,
  //       longitude
  //     },
  //     country: faker.location.country(),
  //     countryCode: faker.location.countryCode(),
  //     county: faker.helpers.maybe(() => faker.location.county(), { probability: 0.5 }),
  //     direction: faker.location.direction(),
  //     language: faker.helpers.arrayElement(['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese']),
  //     ordinalDirection: faker.helpers.arrayElement(['NE', 'SE', 'SW', 'NW']),
  //     state: faker.location.state(),
  //     timeZone: faker.location.timeZone(),
  //     zipCode: faker.location.zipCode()
  //   };
  // }

  // /**
  //  * Seed Person collection
  //  */
  // public static async seedPersons(count: number = 50): Promise<number> {
  //   try {
  //     winstonLogger.info(`Seeding ${count} persons...`);
  //     const persons = Array.from({ length: count }, () => this.generatePerson());
  //     const result = await Person.insertMany(persons);
  //     winstonLogger.info(`Successfully seeded ${result.length} persons`);
  //     return result.length;
  //   } catch (error: any) {
  //     winstonLogger.error('Error seeding persons:', error);
  //     throw error;
  //   }
  // }

  // /**
  //  * Seed Airline collection
  //  */
  // public static async seedAirlines(count: number = 50): Promise<number> {
  //   try {
  //     winstonLogger.info(`Seeding ${count} airlines...`);
  //     const airlines = Array.from({ length: count }, () => this.generateAirline());
  //     const result = await Airline.insertMany(airlines);
  //     winstonLogger.info(`Successfully seeded ${result.length} airlines`);
  //     return result.length;
  //   } catch (error: any) {
  //     winstonLogger.error('Error seeding airlines:', error);
  //     throw error;
  //   }
  // }

  // /**
  //  * Seed Finance collection
  //  */
  // public static async seedFinances(count: number = 50): Promise<number> {
  //   try {
  //     winstonLogger.info(`Seeding ${count} finance records...`);
  //     const finances = Array.from({ length: count }, () => this.generateFinance());
  //     const result = await Finance.insertMany(finances);
  //     winstonLogger.info(`Successfully seeded ${result.length} finance records`);
  //     return result.length;
  //   } catch (error: any) {
  //     winstonLogger.error('Error seeding finances:', error);
  //     throw error;
  //   }
  // }

  // /**
  //  * Seed Book collection
  //  */
  // public static async seedBooks(count: number = 50): Promise<number> {
  //   try {
  //     winstonLogger.info(`Seeding ${count} books...`);
  //     const books = Array.from({ length: count }, () => this.generateBook());
  //     const result = await Book.insertMany(books);
  //     winstonLogger.info(`Successfully seeded ${result.length} books`);
  //     return result.length;
  //   } catch (error: any) {
  //     winstonLogger.error('Error seeding books:', error);
  //     throw error;
  //   }
  // }

  // /**
  //  * Seed Commerce collection
  //  */
  // public static async seedCommerce(count: number = 50): Promise<number> {
  //   try {
  //     winstonLogger.info(`Seeding ${count} commerce records...`);
  //     const commerce = Array.from({ length: count }, () => this.generateCommerce());
  //     const result = await Commerce.insertMany(commerce);
  //     winstonLogger.info(`Successfully seeded ${result.length} commerce records`);
  //     return result.length;
  //   } catch (error: any) {
  //     winstonLogger.error('Error seeding commerce:', error);
  //     throw error;
  //   }
  // }

  // /**
  //  * Seed Company collection
  //  */
  // public static async seedCompanies(count: number = 50): Promise<number> {
  //   try {
  //     winstonLogger.info(`Seeding ${count} companies...`);
  //     const companies = Array.from({ length: count }, () => this.generateCompany());
  //     const result = await Company.insertMany(companies);
  //     winstonLogger.info(`Successfully seeded ${result.length} companies`);
  //     return result.length;
  //   } catch (error: any) {
  //     winstonLogger.error('Error seeding companies:', error);
  //     throw error;
  //   }
  // }

  // /**
  //  * Seed Location collection
  //  */
  // public static async seedLocations(count: number = 50): Promise<number> {
  //   try {
  //     winstonLogger.info(`Seeding ${count} locations...`);
  //     const locations = Array.from({ length: count }, () => this.generateLocation());
  //     const result = await Location.insertMany(locations);
  //     winstonLogger.info(`Successfully seeded ${result.length} locations`);
  //     return result.length;
  //   } catch (error: any) {
  //     winstonLogger.error('Error seeding locations:', error);
  //     throw error;
  //   }
  // }

  // /**
  //  * Seed all collections
  //  */
  // public static async seedAll(count: number = 50): Promise<{
  //   persons: number;
  //   airlines: number;
  //   finances: number;
  //   books: number;
  //   commerce: number;
  //   companies: number;
  //   locations: number;
  //   total: number;
  // }> {
  //   try {
  //     winstonLogger.info('Starting to seed all collections...');
  //     const startTime = Date.now();

  //     const [persons, airlines, finances, books, commerce, companies, locations] = await Promise.all([
  //       this.seedPersons(count),
  //       this.seedAirlines(count),
  //       this.seedFinances(count),
  //       this.seedBooks(count),
  //       this.seedCommerce(count),
  //       this.seedCompanies(count),
  //       this.seedLocations(count)
  //     ]);

  //     const total = persons + airlines + finances + books + commerce + companies + locations;
  //     const duration = Date.now() - startTime;

  //     winstonLogger.info(`Successfully seeded all collections in ${duration}ms`, {
  //       persons,
  //       airlines,
  //       finances,
  //       books,
  //       commerce,
  //       companies,
  //       locations,
  //       total
  //     });

  //     return {
  //       persons,
  //       airlines,
  //       finances,
  //       books,
  //       commerce,
  //       companies,
  //       locations,
  //       total
  //     };
  //   } catch (error: any) {
  //     winstonLogger.error('Error seeding all collections:', error);
  //     throw error;
  //   }
  // }

  // /**
  //  * Clear all collections
  //  */
  // public static async clearAll(): Promise<void> {
  //   try {
  //     winstonLogger.info('Clearing all collections...');

  //     await Promise.all([
  //       Person.deleteMany({}),
  //       Airline.deleteMany({}),
  //       Finance.deleteMany({}),
  //       Book.deleteMany({}),
  //       Commerce.deleteMany({}),
  //       Company.deleteMany({}),
  //       Location.deleteMany({})
  //     ]);

  //     winstonLogger.info('Successfully cleared all collections');
  //   } catch (error: any) {
  //     winstonLogger.error('Error clearing collections:', error);
  //     throw error;
  //   }
  // }
}

export default DataSeeder;