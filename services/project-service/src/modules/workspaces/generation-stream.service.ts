import { Injectable } from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import type { GenerationStreamEvent } from "./generation-events";

const MAX_REPLAY_EVENTS = 120;

@Injectable()
export class GenerationStreamService {
  private readonly channels = new Map<string, Subject<GenerationStreamEvent>>();
  private readonly replayBuffers = new Map<string, GenerationStreamEvent[]>();

  observe(projectId: string): Observable<GenerationStreamEvent> {
    return this.getOrCreate(projectId).asObservable();
  }

  /** Events emitted since generation started — for clients that connect after redirect. */
  replay(projectId: string): readonly GenerationStreamEvent[] {
    return [...(this.replayBuffers.get(projectId) ?? [])];
  }

  emit(projectId: string, event: GenerationStreamEvent) {
    this.appendReplay(projectId, event);
    this.getOrCreate(projectId).next(event);
  }

  complete(projectId: string) {
    const channel = this.channels.get(projectId);
    if (!channel) {
      return;
    }
    channel.complete();
    this.channels.delete(projectId);
  }

  private appendReplay(projectId: string, event: GenerationStreamEvent) {
    const buffer = this.replayBuffers.get(projectId) ?? [];
    buffer.push(event);
    if (buffer.length > MAX_REPLAY_EVENTS) {
      buffer.splice(0, buffer.length - MAX_REPLAY_EVENTS);
    }
    this.replayBuffers.set(projectId, buffer);
  }

  private getOrCreate(projectId: string) {
    let channel = this.channels.get(projectId);
    if (!channel) {
      channel = new Subject<GenerationStreamEvent>();
      this.channels.set(projectId, channel);
    }
    return channel;
  }
}
