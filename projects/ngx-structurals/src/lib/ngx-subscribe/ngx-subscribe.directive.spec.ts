import { Component } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { NgxSubscribeDirective } from './ngx-subscribe.directive';

function setupComponent<T>(component: new(...args: any[]) => T, targetSelector: string): [ComponentFixture<T>, () => HTMLElement] {
    TestBed.configureTestingModule({
        declarations: [NgxSubscribeDirective, component],
    });

    TestBed.compileComponents().then();
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();

    return [
        fixture,
        () => (fixture.nativeElement as HTMLElement).querySelector(targetSelector) as HTMLElement,
    ];
}

describe('ngxSubscribe', () => {
    it('subscribes to the observable and shows the emitted value', waitForAsync(() => {
        @Component({
            template: `<div *ngxSubscribe="let value of source$">{{ value }}</div>`,
        })
        class TestComponent {
            public source$ = of(42);
        }

        const [, getTarget] = setupComponent(TestComponent, 'div');
        expect(getTarget().textContent).toBe('42');
    }));

    it('updates as more values emit', waitForAsync(() => {
        @Component({
            template: `<div *ngxSubscribe="let value of source$">{{ value }}</div>`,
        })
        class TestComponent {
            public source$ = new Subject<number>();
        }

        const [fixture, getTarget] = setupComponent(TestComponent, 'div');
        expect(getTarget().textContent).toBe('');

        [42, 1337].forEach(i => {
            fixture.componentInstance.source$.next(i);
            fixture.detectChanges();
            expect(getTarget().textContent).toBe(`${i}`);
        });
    }));

    it('counts the number of emitted values', waitForAsync(async () => {
        @Component({
            template: `<div *ngxSubscribe="source$; let count = count">{{ count }}</div>`,
        })
        class TestComponent {
            public source$ = new Subject<void>();
        }

        const [fixture, getTarget] = setupComponent(TestComponent, 'div');
        expect(getTarget().textContent).toBe('0');

        [1, 2, 3].forEach(i => {
            fixture.componentInstance.source$.next();
            fixture.detectChanges();
            expect(getTarget().textContent).toBe(`${i}`);
        });
    }));

    it('contains information about the error of the observable', waitForAsync(async () => {
        @Component({
            template: `
                <div *ngxSubscribe="source$; let errored = errored; let error = error">
                    {{ errored }} | {{ error }}
                </div>
            `,
        })
        class TestComponent {
            public source$ = new Subject<void>();
        }

        const [fixture, getTarget] = setupComponent(TestComponent, 'div');
        expect(getTarget().textContent.trim()).toBe('false |');

        fixture.componentInstance.source$.error(42);
        fixture.detectChanges();
        expect(getTarget().textContent.trim()).toBe('true | 42');
    }));

    it('contains information about the completion of the observable', waitForAsync(async () => {
        @Component({
            template: `
                <div *ngxSubscribe="source$; let completed = completed">
                    {{ completed }}
                </div>
            `,
        })
        class TestComponent {
            public source$ = new Subject<void>();
        }

        const [fixture, getTarget] = setupComponent(TestComponent, 'div');
        expect(getTarget().textContent.trim()).toBe('false');

        fixture.componentInstance.source$.complete();
        fixture.detectChanges();
        expect(getTarget().textContent.trim()).toBe('true');
    }));

    it('can display a different template', waitForAsync(async () => {
        @Component({
            template: `
                <div>
                    <ng-template [ngxSubscribe]="source$" [ngxSubscribeThen]="thenTemplate">Pending</ng-template>
                    <ng-template #thenTemplate let-value>{{ value }}</ng-template>
                </div>
            `,
        })
        class TestComponent {
            public source$ = new Subject<number>();
        }

        const [fixture, getTarget] = setupComponent(TestComponent, 'div');
        expect(getTarget().textContent).toBe('Pending');

        fixture.componentInstance.source$.next(42);
        fixture.detectChanges();
        expect(getTarget().textContent).toBe('42');
    }));

    it('can display a different template if no value has been emitted yet', waitForAsync(async () => {
        @Component({
            template: `
                <div>
                    <ng-template [ngxSubscribe]="source$" [ngxSubscribeBeforeAny]="pendingTemplate"></ng-template>
                    <ng-template #pendingTemplate>Pending</ng-template>
                </div>
            `,
        })
        class TestComponent {
            public source$ = new Subject<void>();
        }

        const [fixture, getTarget] = setupComponent(TestComponent, 'div');
        expect(getTarget().textContent).toBe('Pending');

        fixture.componentInstance.source$.next();
        fixture.detectChanges();
        expect(getTarget().textContent).toBe('');
    }));

    it('can display a different template if an error occurred', waitForAsync(async () => {
        @Component({
            template: `
                <div>
                    <ng-template [ngxSubscribe]="source$" [ngxSubscribeOnError]="errorTemplate"></ng-template>
                    <ng-template #errorTemplate>Error</ng-template>
                </div>
            `,
        })
        class TestComponent {
            public source$ = new Subject<void>();
        }

        const [fixture, getTarget] = setupComponent(TestComponent, 'div');
        expect(getTarget().textContent).toBe('');

        fixture.componentInstance.source$.error(42);
        fixture.detectChanges();
        expect(getTarget().textContent).toBe('Error');
    }));

    it('can display a different template if the observable completed', waitForAsync(async () => {
        @Component({
            template: `
                <div>
                    <ng-template [ngxSubscribe]="source$" [ngxSubscribeOnCompleted]="completionTemplate"></ng-template>
                    <ng-template #completionTemplate>Completed</ng-template>
                </div>
            `,
        })
        class TestComponent {
            public source$ = new Subject<void>();
        }

        const [fixture, getTarget] = setupComponent(TestComponent, 'div');
        expect(getTarget().textContent).toBe('');

        fixture.componentInstance.source$.complete();
        fixture.detectChanges();
        expect(getTarget().textContent).toBe('Completed');
    }));

    it('resubscribes if the observable changes', waitForAsync(async () => {
        @Component({
            template: `
                <div *ngxSubscribe="let value of source$; let count = count; let errored = errored; let error = error">
                    {{ value }} | {{ count }} | {{ errored }} | {{ error }}
                </div>
            `,
        })
        class TestComponent {
            public source$ = new Subject<number>();
        }

        const [fixture, getTarget] = setupComponent(TestComponent, 'div');
        fixture.componentInstance.source$.next(42);
        fixture.componentInstance.source$.error(1337);
        fixture.detectChanges();
        expect(getTarget().textContent.trim()).toBe('42 | 1 | true | 1337');

        fixture.componentInstance.source$ = new Subject<number>();
        fixture.detectChanges();
        expect(getTarget().textContent.trim()).toBe('| 0 | false |');
    }));
});
