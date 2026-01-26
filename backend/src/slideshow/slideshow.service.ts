import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { readdirSync } from 'fs';
import { UPLOADS_DIR } from 'src/scripts/consts';

@Injectable()
export class SlideshowService {
    private queue: string[] = [];
    private loop: string[] = [];

    addToQueue(file: string) {
        this.queue.push(file);
    }

    removeFromQueue(file: string) {
        this.queue = this.queue.filter((f) => f !== file);
    }

    getQueue(): string[] {
        return this.queue.slice();
    }

    addToLoop(file: string) {
        if (!this.loop.includes(file)) this.loop.push(file);
    }

    removeFromLoop(file: string) {
        this.loop = this.loop.filter((f) => f !== file);
    }

    getLoop(): string[] {
        return this.loop.slice();
    }

    getNext(): string | undefined {
        if (this.queue.length > 0) {
            return this.queue.shift();
        }

        if (this.loop.length > 0) {
            const next = this.loop.shift();

            if (next) this.loop.push(next);
            return next;
        }

        try {
            const files = readdirSync(UPLOADS_DIR);
            if (files.length === 0) return undefined;
            const randomIndex = Math.floor(Math.random() * files.length);
            return files[randomIndex];
        } catch {
            return undefined;
        }
    }

    @OnEvent('file.deleted')
    handleFileDeleted(filename: string) {
        this.removeFromQueue(filename);
        this.removeFromLoop(filename);
    }
}
