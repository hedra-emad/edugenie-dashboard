import { Injectable, OnDestroy } from '@angular/core';
import Pusher, { Channel } from 'pusher-js';
import { environment } from '../../../environments/enviroment';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PusherService implements OnDestroy {
  private pusher: Pusher;
  private channel: Channel | null = null;

  public notification$ = new Subject<any>();

  constructor() {
    this.pusher = new Pusher(environment.pusherKey, {
      cluster: environment.pusherCluster,
    });
  }

  subscribeToUser(userId: string) {
    this.channel = this.pusher.subscribe(`user-${userId}`);
    this.channel.bind('new-notification', (data: any) => {
      this.notification$.next(data);
    });
  }

  unsubscribe(userId: string) {
    if (this.channel) {
      this.channel.unbind('new-notification');
      this.pusher.unsubscribe(`user-${userId}`);
      this.channel = null;
    }
  }

  ngOnDestroy() {
    this.pusher.disconnect();
  }
}