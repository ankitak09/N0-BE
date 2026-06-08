import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Kafka, Producer, logLevel } from "kafkajs";

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private enabled = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    this.enabled = this.config.get("ENABLE_KAFKA") === "true";
    if (!this.enabled) {
      this.logger.log("Kafka disabled (ENABLE_KAFKA != true)");
      return;
    }

    const brokers = (this.config.get<string>("KAFKA_BROKERS") ?? "localhost:9092").split(",");
    this.kafka = new Kafka({
      clientId: this.config.get("KAFKA_CLIENT_ID") ?? "n0-ai-service",
      brokers,
      logLevel: logLevel.ERROR,
    });
    this.producer = this.kafka.producer();
    await this.producer.connect();
    this.logger.log(`Kafka producer connected (${brokers.join(", ")})`);
  }

  async onModuleDestroy() {
    if (this.producer) {
      await this.producer.disconnect();
    }
  }

  async emit<T extends object>(topic: string, payload: T, key?: string) {
    if (!this.enabled || !this.producer) {
      this.logger.debug(`[kafka:skipped] ${topic}`);
      return;
    }

    await this.producer.send({
      topic,
      messages: [{ key: key ?? undefined, value: JSON.stringify(payload) }],
    });
  }
}
