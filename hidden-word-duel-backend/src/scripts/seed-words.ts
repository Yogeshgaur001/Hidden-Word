import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { Word } from '../word/entities/word.entity';
import { words } from '../data/words';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const wordRepo = dataSource.getRepository(Word);

  for (const value of words) {
    // Avoid duplicate insertions
    const exists = await wordRepo.findOneBy({ value });
    if (!exists) {
      await wordRepo.save({ value });
    }
  }

  await app.close();
  console.log('Words seeded!');
}

bootstrap();