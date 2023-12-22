import { Injectable } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { CreateVideoCommand } from '../command/create-video.command';
import { DataSource } from 'typeorm';
import { Video } from '../entities/video.entity';
import { User } from '../../user/entities/user.entity';
import { VideoCreatedEvent } from '../event/video-created.event';

// Nest.js CQRS 패턴을 사용해 구현한 비디오 생성 핸들러 CreateVideoHandler
@Injectable()
@CommandHandler(CreateVideoCommand)
export class CreateVideoHandler implements ICommandHandler<CreateVideoCommand> {
  constructor(
    private dataSource: DataSource,
    private eventBus: EventBus,
  ) {}

  async execute(command: CreateVideoCommand): Promise<Video> {
    const { userId, title, mimetype, extension, buffer } = command;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();
    let error;

    try {
      const user = await queryRunner.manager.findOneBy(User, { id: userId });
      const video = await queryRunner.manager.save(
        queryRunner.manager.create(Video, { title, mimetype }),
      );
      await this.uploadVideo(video.id, extension, buffer);
      await queryRunner.commitTransaction();
      this.eventBus.publish(new VideoCreatedEvent(video.id)); // eventBus를 활용하여 이벤트를 퍼블리싱
      return video; // video 반환
    } catch (err) {
      await queryRunner.rollbackTransaction();
      error = err;
    } finally {
      await queryRunner.release();
      if (error) throw error;
    }
  }

  private async uploadVideo(id: string, extension: string, buffer: Buffer) {
    console.log('upload video');
  }
}