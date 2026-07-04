import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FilterBarComponent } from './filter-bar.component';

describe('FilterBarComponent', () => {
  let component: FilterBarComponent;
  let fixture: ComponentFixture<FilterBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        FilterBarComponent,
        NoopAnimationsModule
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilterBarComponent);
    component = fixture.componentInstance;

    // Set required config
    component.config = {
      statusOptions: [
        { value: 'published', label: 'Published' },
        { value: 'draft', label: 'Draft' }
      ],
      levelOptions: [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' }
      ],
      priceOptions: [
        { value: 'all', label: 'All Courses' },
        { value: 'free', label: 'Free Courses' }
      ],
      sortOptions: [
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' }
      ]
    };

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate active filter count correctly', () => {
    component.searchTerm.set('test');
    component.selectedStatuses.set(['published']);

    expect(component.activeFilterCount()).toBe(2);
  });

  it('should emit filter change on search', () => {
    spyOn(component.filterChange, 'emit');

    component.onSearchChange('test query');

    expect(component.filterChange.emit).toHaveBeenCalled();
  });

  it('should toggle drawer state', () => {
    expect(component.isDrawerOpen()).toBeFalse();

    component.toggleDrawer();
    expect(component.isDrawerOpen()).toBeTrue();

    component.closeDrawer();
    expect(component.isDrawerOpen()).toBeFalse();
  });

  it('should toggle status filter correctly', () => {
    component.toggleStatusFilter('published');
    expect(component.selectedStatuses()).toContain('published');

    component.toggleStatusFilter('published');
    expect(component.selectedStatuses()).not.toContain('published');
  });
});
