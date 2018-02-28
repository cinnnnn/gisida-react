import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Actions, generateFilterOptions } from 'gisida';
import PropTypes from 'prop-types';
import FilterSelector from './FilterSelector';
import './Filter.scss';

const mapStateToProps = (state, ownProps) => {
  let layersObj = [];
  Object.keys(state.MAP.layers).forEach((key) => {
    const layer = state.MAP.layers[key];
    if (layer.visible) {
      layersObj.push(layer);
    }
  });
  return {
    layerObj: state.MAP.layers[state.MAP.filter.layerId],
    doShowProfile: state.MAP.showProfile,
    showFilterPanel: state.MAP.showFilterPanel,
    layersObj: layersObj,
    showFilterBtn: state.MAP.filter.layerId,
    layerData: state.MAP.layers,
  }
}

class Filter extends Component {
  constructor(props) {
    super(props);
    const { layerObj } = this.props.layerObj || {
      filterOptions: {}
    }
    const filters = null;
    const filterOptions = {}
    const id = null
    this.state = {
      isFiltered: false,
      prevFilters: null,
      layerId: id,
      filters,
      filterOptions,
      doShowProfile: this.props.doShowProfile,
      isOpen: false,
      isMac: (window.navigator.platform.indexOf('Mac') !== -1),
      isLinux: (window.navigator.platform.indexOf('Linux') !== -1),
      globalSearchField: false,
      layersObj: []
    };
  }

  buildFiltersMap(filters, layerFilters, prevFilters) {
    const filterMap = {};
    const filterKeys = Object.keys(filters);
    let filterKey;
    let options;
    let optionKeys;
    let optionKey;
    let filter;
    let f;
    let o;

    // todo - use this again to sort options
    // const optionSort = (a, b) => {
    //   if (typeof a === 'string' && typeof b === 'string') {
    //     if (a.toUpperCase() < b.toUpperCase()) {
    //       return -1;
    //     }
    //     if (a.toUpperCase() > b.toUpperCase()) {
    //       return 1;
    //     }
    //   } else {
    //     if (a < b) {
    //       return -1;
    //     }
    //     if (a > b) {
    //       return -1;
    //     }
    //   }
    //   return 0;
    // };

    // loop over all filters
    for (f = 0; f < filterKeys.length; f += 1) {
      filterKey = filterKeys[f];
      filter = {
        label: filters[filterKey].label,
        toggleAllOn: prevFilters
          ? prevFilters[filterKey].toggleAllOn
          : true, // controls toggle all functionality and text
        isFiltered: prevFilters
          ? prevFilters[filterKey].isFiltered
          : false, // whether any options have been modified
        isOriginal: true, // whether the filter has been filtered
        options: {}, // actual filter options map
        isOpen: prevFilters ? prevFilters[filterKey].isOpen : false,
      };

      options = filters[filterKey].filterValues;
      optionKeys = Object.keys(options);
      // loop over all options
      for (o = 0; o < optionKeys.length; o += 1) {
        optionKey = optionKeys[o];
        // set filter option to true
        filter.options[optionKey] = {
          enabled: false,
          count: options[optionKey],
        };
      }

      // add filter to the filterMap
      filterMap[filterKey] = filter;
    }

    if (layerFilters) {
      for (f = 0; f < layerFilters.length; f += 1) {
        if (layerFilters[f] instanceof Array) {
          for (o = 0; o < layerFilters[f].length; o += 1) {
            if (layerFilters[f][o] instanceof Array) {
              filterKey = layerFilters[f][o][1];
              optionKey = layerFilters[f][o][2];
              filterMap[filterKey].options[optionKey].enabled = true;
              filterMap[filterKey].options[optionKey].hidden = false;
              if (!filterMap[filterKey]) filterMap[filterKey].isFiltered = true;
            }
          }
        }
      }
    }

    return filterMap;
  }

  isFiltered(options, isOriginal) {
    const optionKeys = Object.keys(options);
    let hasEnabled = false;
    let hasDisabled = false;
    let i;

    // if original check for BOTH enabled and disabled options
    if (isOriginal || typeof isOriginal === 'undefined') {
      for (i = 0; i < optionKeys.length; i += 1) {
        if (options[optionKeys[i]].count && options[optionKeys[i]].enabled) {
          hasEnabled = true;
        } else if (options[optionKeys[i]].count) {
          hasDisabled = true;
        }
      }
      return hasEnabled && hasDisabled;
    }

    // if filtered check for a single enabled option
    for (i = 0; i < optionKeys.length; i += 1) {
      if (options[optionKeys[i]].enabled) return true;
    }
    return false;
  }

  mergeFilters(originalFilters, filteredFilters, clickedFilterKey) {
    if (!filteredFilters || !(Object.keys(filteredFilters).length)) {
      return originalFilters;
    }
    // Define keys of all the filters and an obj to map merged filters into
    const filterKeys = Object.keys(originalFilters);
    const nextFilters = {};

    let filterIsOpen;
    let nextFilter;
    let filterKey;
    let oOptions;
    let fOptions;
    let ooKeys;
    let ooKey;

    // Loop through all the filters
    for (let f = 0; f < filterKeys.length; f += 1) {
      filterKey = filterKeys[f];
      filterIsOpen = originalFilters[filterKey].isOpen;

      if (filterKey === clickedFilterKey && originalFilters[filterKey].isFiltered) {
        nextFilters[filterKey] = originalFilters[filterKey];
      } else {
        nextFilter = Object.assign(
          {},
          filteredFilters[filterKey],
          {
            label: originalFilters[filterKey].label,
            isOriginal: false,
            isFiltered: originalFilters[filterKey].isFiltered,
            toggleAllOn: originalFilters[filterKey].toggleAllOn,
            isOpen: filterIsOpen,
          },
        );
        fOptions = filteredFilters[filterKey].options;
        oOptions = originalFilters[filterKey].options;
        ooKeys = Object.keys(oOptions);

        // Loop through all of the original filter options
        for (let o = 0; o < ooKeys.length; o += 1) {
          ooKey = ooKeys[o];
          // If the filtered filter doesn't have the option, add it
          if (!fOptions[ooKey]) {
            nextFilter.options[ooKey] = {
              count: 0,
              enabled: false,
              hidden: false,
            };
          } else {
            nextFilter.options[ooKey].enabled = oOptions[ooKey].enabled;
          }
        }
        nextFilters[filterKey] = nextFilter;
      }
    }

    return nextFilters;
  }

  // TODO: move filters list to Redux state and applyFilters to Map.js
  applyFilters(layerId, filters) {
    if (window.GisidaMap.getLayer(layerId)) {
      window.GisidaMap.setFilter(layerId, filters);
    }
  }

  getLayerFilter(layerId) {
    let layerObj;
    for (let i = 0; i < this.state.layersObj.length; i += 1) {
      layerObj = this.state.layersObj[i];
      if (layerObj.id === layerId) {
        return layerObj.filters && layerObj.filters.layerFilters;
      }
    }
    return null;
  }

  setLayerFilter(layerId, filters) {
    let nextLayerObj;
    let featureLayerObj;
    const nextLayersObj = [];
    for (let i = 0; i < this.props.layersObj.length; i += 1) {
      nextLayerObj = this.props.layersObj[i];
      if (nextLayerObj.id === layerId) {
        nextLayerObj.filters.layerFilters = filters;
        featureLayerObj = Object.assign({}, nextLayerObj);
      }
      nextLayersObj.push(nextLayerObj);
    }

    this.setState({
      layerObj: nextLayerObj,
      layersObj: nextLayersObj,
    }, () => {
      this.buildFilters(featureLayerObj);
    });
  }

  buildFilters(layerObj) {
    const layerId = layerObj.id;
    const filterKeys = Object.keys(layerObj.filters);
    let filter;
    const combinedFilters = ['all'];

    // loop through filters object
    for (let f = 0; f < filterKeys.length; f += 1) {
      filter = layerObj.filters[filterKeys[f]];

      if (filterKeys[f] === 'highlight') {
        // handle highlight filter seperately
        this.applyFilters(`${layerId}-highlight`, filter);
      } else if (filter) {
        // build out combined filters
        combinedFilters.push(filter);
      }
    }

    if (combinedFilters.length > 2) {
      // if there are multiple filters apply as is
      this.applyFilters(layerId, combinedFilters);
    } else if (combinedFilters.length === 2) {
      // if there is only one filter, apply the only one
      this.applyFilters(layerId, combinedFilters[1]);
    } else if (combinedFilters.length === 1 && combinedFilters[0] === 'all') {
      // if nothing was added to the combined filter array, removal all filters
      this.applyFilters(layerId, null);
    }
  }

  handleFilterClick() {
    const dispatch = this.props.dispatch;
    dispatch(Actions.toggleFilter());
  }

  componentWillReceiveProps(nextProps) {
    const layerObj = nextProps.layerObj || {
      filterOptions: {}
    };
    const { filterOptions, id } = layerObj;
    if (filterOptions && Object.keys(filterOptions).length > 0) {
      const layerFilters = this.getLayerFilter(id);
      const filters = this.state.isFiltered && this.state.prevFilters ? this.state.prevFilters
        : this.buildFiltersMap(filterOptions, layerFilters, this.state.filters);
      
      this.setState({
        filters,
        filterOptions,
        layerId: id,
        doShowProfile: false,
      });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    window.GisidaMap.resize();
    const { layersObj, layerObj, layerData } = this.props;
    if ((layerObj && layerObj.aggregate && prevProps.layerObj && prevProps.layerObj.aggregate) || layersObj && layersObj[layersObj.length - 1]) {
      let lData;
      // todo - update this conditional to look for feature-view property
      for (let l = 0; l < layersObj.length; l += 1) {
        lData = layerData[layersObj[l].id];
        // todo - update this conditional to look for feature-view property
        if (lData && lData['highlight-filter-property'] && window.GisidaMap.getLayer(layersObj[l].id)) {
          let nextLayerObj;
          let featureLayerObj;
          const nextLayersObj = [];
          // loop through layerObjs to find highlighted layerObj
          for (let i = 0; i < layersObj.length; i += 1) {
            nextLayerObj = layersObj[i];
            if (nextLayerObj.id === layersObj[l].id && nextLayerObj.filters.highlight && nextLayerObj.filters.rHighlight) {
              nextLayerObj.filters.highlight[2] = '';
              nextLayerObj.filters.rHighlight[2] = '';
            }
            featureLayerObj = Object.assign({}, nextLayerObj);
            nextLayersObj.push(nextLayerObj);
          }
          // update highlighted layerObj to original state
          this.setState(() => {
            // apply the new default filters
            this.buildFilters(featureLayerObj);
          });
        }
      }
    }
  }

  onCloseClick = (e) => {
    e.preventDefault();
    //TODO dispach close action
    // this.setState({
    //   showFilterModal: false,
    // });
  }
  
  onFilterItemClick = (e, filterKey) => {
    e.preventDefault();
    const { filters } = this.state;
    const nextFilters = filters;
    nextFilters[filterKey].isOpen = !filters[filterKey].isOpen;
    // nextFilters[filterKey].doAdvFiltering = false;
    this.setState({
      filters: nextFilters,
    });
  }

  onFilterOptionClick = (e, filterKey) => {
    e.stopPropagation();
    const { filters } = this.state;
    const option = filters[filterKey].options[e.target.value];
    const nextOptions = Object.assign(
      {},
      filters[filterKey].options,
      {
        [e.target.value]: {
          enabled: !option.enabled,
          count: option.count,
        },
      },
    );

    const {
      isFiltered,
      nextFilters,
    } = (this.buildNextFilters(nextOptions, filters, filterKey, true));

    this.setState({
      isFiltered,
      filters: nextFilters,
    });
  }

  onToggleAllOptions = (e, toggleAllOn, filterKey) => {
    e.stopPropagation();
    const { filters } = this.state;
    const options = filters[filterKey].options;
    let option;
    const optionKeys = Object.keys(options);
    const nextOptions = Object.assign({}, options);
    for (let o = 0; o < optionKeys.length; o += 1) {
      option = options[optionKeys[o]];
      nextOptions[optionKeys[o]].enabled = option.count && !option.hidden ? toggleAllOn : false;
    }

    const { isFiltered, nextFilters } = (this.buildNextFilters(nextOptions, filters, filterKey));

    this.setState({
      filters: nextFilters,
      isFiltered,
    });
  }

  onClearClick = (e, isFilterable) => {
    e.preventDefault();
    if (!isFilterable) {
      return false;
    }
    const { layerId, filterOptions } = this.state;
    this.setState({
      isFiltered: false,
      filters: this.buildFiltersMap(filterOptions),
      prevFilters: null,
    }, () => {
      this.setLayerFilter(layerId, null);
    });
    return true;
  }

  onApplyClick = (e, isFilterable) => {
    e.preventDefault();
    if (!isFilterable) {
      return false;
    }
    const { filters, layerId } = this.state;
    const filterKeys = Object.keys(filters);
    const nextFilters = ['all'];

    let newFilters;
    let options;
    let optionKeys;
    // loop through all filters
    for (let f = 0; f < filterKeys.length; f += 1) {
      // chec if the filter is actually filtered
      if (filters[filterKeys[f]].isFiltered) {
        newFilters = ['any'];
          // define the options and option keys for this filter
          options = filters[filterKeys[f]].options;
          optionKeys = Object.keys(options);
          // loop through all options and add to this filter
          for (let o = 0; o < optionKeys.length; o += 1) {
            if (options[optionKeys[o]].enabled) {
              newFilters.push(['==', filterKeys[f], optionKeys[o]]);
            }
          }
        // push this filter to the combind filter
        if (newFilters.length > 1) {
          nextFilters.push(newFilters);
        }
      }
    }

    // if (outsideFilters) {
    //   nextFilters = [].concat(outsideFilters, [...nextFilters])
    // }

    this.setState({
      isFiltered: true,
      prevFilters: filters,
    }, () => {
      this.setLayerFilter(layerId, nextFilters);
    });
    return true;
  }

  setFilterQueries = (filterKey, nextQueries, queriedOptionKeys) => {
    const prevFilters = Object.assign({}, this.state.filters);
    prevFilters[filterKey].queries = nextQueries;
    prevFilters[filterKey].queriedOptionKeys = queriedOptionKeys;

    const {
      nextFilters,
    } = (this.buildNextFilters(prevFilters[filterKey].options, prevFilters, filterKey, true));

    this.setState({ filters: nextFilters });
  }

  searchFilterOptions = (e, filterKey) => {
    const val = (e.target.value || '').toLowerCase();
    const options = Object.assign({}, this.state.filters[filterKey].options);
    const optionKeys = Object.keys(options);
    let optionKey;
    let isClear = false;
    let toggleAllOn = false;
    let isMatched;
    if (val === '') isClear = true;

    for (let o = 0; o < optionKeys.length; o += 1) {
      optionKey = optionKeys[o];
      if (options[optionKey].count) {
        isMatched = isClear || (optionKey.toLowerCase()).indexOf(val) !== -1;
        options[optionKey].hidden = !isMatched;
        if (!options[optionKey].hidden && !options[optionKey].enabled) {
          toggleAllOn = true;
        }
      }
    }
    const nextFilters = Object.assign(
      {},
      this.state.filters,
      {
        [filterKey]: {
          isFiltered: this.isFiltered(options),
          toggleAllOn,
          options,
          isOpen: true,
          doAdvFiltering: e.target.getAttribute('data-type') === 'advanced-filter',
          // queries: null,
        },
      },
    );

    this.setState({
      filters: nextFilters,
    });
  }

  clearAllFiltersSearch = (e) => {
    const { filters } = this.state;
    this.searchEl.value = '';
    this.allFiltersSearch(e);
    // this.onClearClick(e, isFilterable);
    const filterKeys = Object.keys(filters);
    let filter;
    let filterKey;
    let options;

    for (let f = 0; f < filterKeys.length; f += 1) {
      filterKey = filterKeys[f];
      filter = filters[filterKeys[f]];
      filter.isOpen = false;
      options = filter.options;
    }

    const nextFilters = Object.assign(
      {},
      filters,
      {
        [filterKey]: {
          isFiltered: this.isFiltered(options),
          options,
          isOpen: false,
        },
      });

    this.setState({
      filters: nextFilters,
    });
  }

  allFiltersSearch = (e) => {
    const { filters } = this.state;
    const val = (e.target.value || '').toLowerCase();
    const filterKeys = filters ? Object.keys(filters) : {};
    let filter;
    let filterKey;
    let options;
    let optionKeys;
    let isMatched;
    let isClear = false;
    let toggleAllOn = false;

    if (val === '') isClear = true;

    for (let f = 0; f < filterKeys.length; f += 1) {
      filterKey = filterKeys[f];
      filter = filters[filterKeys[f]];
        filter.isOpen = true;
        options = filter.options;
        optionKeys = Object.keys(options);

        for (let o = 0; o < optionKeys.length; o += 1) {
          if (options[optionKeys[o]].count) {
            isMatched = isClear || (optionKeys[o].toLowerCase()).indexOf(val) !== -1;
            options[optionKeys[o]].hidden = !isMatched;

            if (!options[optionKeys[o]].hidden && !options[optionKeys[o]].enabled) {
              toggleAllOn = true;
            }
          }
        }
    }

    const nextFilters = Object.assign(
      {},
      filters,
      {
        [filterKey]: {
          isFiltered: this.isFiltered(options),
          options,
          toggleAllOn,
          isOpen: true,
        },
      },
    );

    this.setState({
      filters: nextFilters,
    });
  }

  buildFilteredFilters = (clickedFilterKey, nextFilters) => {
    const aggregate = {
      filter: [],
      'sub-filter': [],
      'accepted-filter-values': [],
      'accepted-sub-filter-values': [],
      'filter-label': [],
    };
    const filters = nextFilters;
    // const { layerObj } = this.props;
    const filterKeys = Object.keys(filters);
    let filterKey;
    let filter;

    let options;
    let option;
    let optionKeys;

    for (let f = 0; f < filterKeys.length; f += 1) {
      filterKey = filterKeys[f];
      // if (filterKey === clickedFilterKey) continue;
      filter = filters[filterKey];
      aggregate.filter[f] = filterKey;
      aggregate['accepted-filter-values'][f] = filter.queriedOptionKeys
        && filter.queriedOptionKeys.length
        ? filter.queriedOptionKeys : [];
      // aggregate['sub-filter'][f] = '';
      // aggregate['accepted-sub-filter-values'][f] = '';
      aggregate['filter-label'][f] = filter.label || '';

      // keys = Object.keys(filters[filterKey]);
      // for (let k = 0; k < keys.length; k += 1) {
      //   if (keys[k] !== 'label' && keys[k] !== 'filterValues') {
      //     aggregate['sub-filter'][f] = keys[k];
      //     aggregate['accepted-sub-filter-values'][f] = [];
      //   }
      // }
      // if (filter.dataType === 'quantitative') {
        // aggregate['accepted-filter-values'][f] =
        // filter.queriedOptionKeys.length ?
        // filter.queriedOptionKeys : 'quant';
      // } else
      if (filter.isFiltered) {
        options = filter.options;
        optionKeys = Object.keys(options);
        for (let o = 0; o < optionKeys.length; o += 1) {
          option = options[optionKeys[o]];

          if (((filter.isOriginal || filter.isFiltered) && option.enabled)
            || ((!filter.isOriginal && !filter.isFiltered) && option.count)) {
            aggregate['accepted-filter-values'][f].push(optionKeys[o]);
          }
        }
        if (optionKeys.length === aggregate['accepted-filter-values'][f].length) {
          aggregate['accepted-filter-values'][f] = 'all';
        }
      // } else if (dataType === 'quantitative') {
      //   aggregate['accepted-filter-values'][f] = filter.isFiltered ?
      } else  {
        // if (filters[filterKey].isOriginal) {
        aggregate['accepted-filter-values'][f] = 'all';
      }

      // if (typeof aggregate['accepted-sub-filter-values'][f] === 'string') {
      //   continue;
      // }

      // options = filters[filterKey][aggregate['sub-filter'][f]];
      // optionKeys = Object.keys(options);
      // for (let o = 0; o < optionKeys.length; o += 1) {
      //   optionKey = optionKeys[o];
      //  if (options[optionKey].enabled) {
      //  aggregate['accepted-sub-filter-values'][f].push(optionKey);
      //  }
      // }
      // if (optionKeys.length === aggregate['accepted-sub-filter-values'][f].length) {
      //   aggregate['accepted-sub-filter-values'][f] = 'all';
      // } else if (!optionKeys.length) {
      //   aggregate['accepted-sub-filter-values'][f] = 'all';
      // }
    }

    const newLayerObj = {
      aggregate,
      source: this.props.layerObj.source,
      type: 'filteredFilter',
    };
    const newLayerOptions = generateFilterOptions(newLayerObj);
    const filteredFilters = this.buildFiltersMap(newLayerOptions);
    return this.mergeFilters(filters, filteredFilters, clickedFilterKey);
  }

  isMapFiltered = () => {
    const layerFilters = this.getLayerFilter(this.state.layerId);
    if (!layerFilters) {
      return false;
    }
    /*const { outsideFilters } = this.state;

    function isArrayEqual(a, b) {
      if (!a || !b) {
        return false;
      }
      if (a.length !== b.length) {
        return false;
      }
      for (let i = 0; i < a.length; i += 1) {
        if (typeof a !== typeof b) {
          return false;
        }
        if (a[i] instanceof Array && b[i] instanceof Array) {
          if (!isArrayEqual(a[i], b[i])) {
            return false;
          }
        } else if (a[i] !== b[i]) {
          return false;
        }
      }
      return true;
    }*/

    return true;
  }

  buildNextFilters = (nextOptions, filters, filterKey, isResetable) => {
    const { toggleAllOn } = filters[filterKey];
    const { filterOptions } = this.state;
    let nextFilters = Object.assign(
      {},
      filters,
      {
        [filterKey]: {
          label: filters[filterKey].label,
          isFiltered: filters[filterKey].isFiltered,
          isOriginal: filters[filterKey].isOriginal,
          toggleAllOn: (isResetable ? toggleAllOn : !toggleAllOn),
          options: nextOptions,
          isOpen: true,
          dataType: filters[filterKey].dataType,
          doAdvFiltering: filters[filterKey].doAdvFiltering,
          queries: filters[filterKey].queries,
          queriedOptionKeys: filters[filterKey].queriedOptionKeys,
        },
      },
    );

    let nextFilter;
    let isFiltered = false;
    const filterKeys = Object.keys(nextFilters);

    for (let i = 0; i < filterKeys.length; i += 1) {
      nextFilter = nextFilters[filterKeys[i]];
      nextFilter.isFiltered = this.isFiltered(nextFilter.options, nextFilter.isOriginal);

      /*// todo - put all this logic in FilterModal.isFiltered()
      const queriedKeys = nextFilter.queriedOptionKeys;
      if (nextFilter.isFiltered
        || (nextFilter.queries && nextFilter.queries.length
        && (nextFilter.queries.length > 1 || nextFilter.queries[0].val !== ''))
        || (Array.isArray(nextFilter.options)
        && (
          [...new Set(nextFilter.options)].length !== queriedKeys.length))) {
        isFiltered = true;
        nextFilter.isFiltered = true;
      }*/
      if (nextFilter.isFiltered) {
        isFiltered = true;
      }
    }

    if (isFiltered) {
      nextFilters = this.buildFilteredFilters(filterKey, nextFilters);
    } else if (isResetable) {
      const layerFilters = this.getLayerFilter(this.props.layerObj.id);
      nextFilters = this.buildFiltersMap(filterOptions, layerFilters, nextFilters);
    }

    return { isFiltered, nextFilters };
  }

  toggleSecondAdvancedOptions = (e, filterKey) => {
    e.preventDefault();
    const { filters } = this.state;
    const nextFilters = filters;
    const isAdvanced = filters[filterKey].expandSecondAdvancedOptions;
    nextFilters[filterKey].expandSecondAdvancedOptions = !isAdvanced;
    this.setState({
      filters: nextFilters,
    });
  }

  showGlobalSearchField = (e) => {
    e.preventDefault();
    this.setState({
      globalSearchField: !this.state.globalSearchField,
    });
  }

  toggleAdvFilter = (e, filterKey) => {
    e.preventDefault();
    const { filters } = this.state;
    const nextFilters = filters;
    nextFilters[filterKey].doAdvFiltering = !filters[filterKey].doAdvFiltering;
    nextFilters[filterKey].expandSecondAdvancedOptions = false;
    this.setState({
      filters: nextFilters,
    });
  }

  render() {
    const { filters, isMac, globalSearchField } = this.state;
    const filterKeys = filters ? Object.keys(filters) : {};
    const filterItems = [];
    let filter;
    let isFilterable = false;
    for (let f = 0; f < filterKeys.length; f += 1) {
      filter = filters[filterKeys[f]];
      const { isFiltered, toggleAllOn, queries, queriedOptionKeys } = filter;
      if (isFiltered) {
        isFilterable = true;
      }
      filterItems.push((
        <li
          className="filter-item"
          key={filterKeys[f]}>
          <a
            className={`indicator-label indicator-item filter-option
              ${filter.isOpen ? ' active' : ''}
              ${isFiltered ? ' filtered filterOptionSelected' : ''}`}
            onClick={(e) => { this.onFilterItemClick(e, filterKeys[f]); }}
            data-type="basic-filter"
            role="button"
            tabIndex="-1"
          >
            {[filterKeys[f]]}
            {/*filter.isOpen ?
              <span
                role="button"
                tabIndex="0"
                title="Advanced Filters"
                className={`glyphicon glyphicon-option-vertical${filter.doAdvFiltering ? ' active' : ' inactive'}`}
                onClick={(e) => { this.toggleAdvFilter(e, filterKeys[f]); }}
                data-key={filterKeys[f]}
              />
            : ''*/}
            <span
              className={`caret caret-${filter.isOpen ? 'down' : 'right'}`}
              data-type="basic-filter"
            />
          </a>
          {filter.isOpen ?
            <FilterSelector
              filter={filter}
              filterKey={filterKeys[f]}
              onFilterOptionClick={this.onFilterOptionClick}
              onToggleAllOptions={this.onToggleAllOptions}
              searchFilterOptions={this.searchFilterOptions}
              doAdvFiltering={filter.doAdvFiltering}
              expandSecondAdvancedOptions={filter.expandSecondAdvancedOptions}
              toggleSecondAdvancedOptions={this.toggleSecondAdvancedOptions}
              toggleAllOn={toggleAllOn}
              globalSearchField={globalSearchField}
              setFilterQueries={this.setFilterQueries}
              queries={queries}
              queriedOptionKeys={queriedOptionKeys}
            />
          : ''}
        </li>
      ));
    }

    const doClear = isFilterable || this.state.isFiltered || this.isMapFiltered();
    const filterBtnPos = this.state.doShowProfile && this.props.isOpen || this.state.isOpen ? '360px' : '10px';

    return (
    <div>
      {
          this.props.showFilterBtn ?
            <button
            className={`filterButton glyphicon glyphicon-filter${this.props.showFilterPanel ? ' open' : ''}`}
            onClick={() => { this.handleFilterClick(); }}
              style={{ right: this.props.showFilterPanel ? '260px' : filterBtnPos }}
          /> : ''
        }

        {
          this.props.showFilterPanel  ?
            <div>
              <div className={`profile-view-container filter-container${isMac ? ' mac' : ''}`}>
                {/*<button
                  className="filter-search"
                
                  onClick={(e) => { this.showGlobalSearchField(e); }}
                >
                  <span className="glyphicon glyphicon-search" />
                </button>*/}
                <button
                  className="close-btn filter-close"
                  title="Close Filters"
                  onClick={() => { this.handleFilterClick(); }}
                >
                  <span className="glyphicon glyphicon-remove" />
                </button>
                <div className="profile-basic-details filter-header-section">
                  <div className="profile-header-section filter-header">
                    <h5>LAYER FILTERS</h5>
                  </div>
                  {globalSearchField ?
                    <div className="search-column">
                      <span className="searchBtn" role="button">
                        <span className="glyphicon glyphicon-search" />
                      </span>
                      <input
                        ref={(el) => { this.searchEl = el; }}
                        type="text"
                        className="filterSearch"
                        placeholder="Search All Filters"
                        onChange={(e) => { this.allFiltersSearch(e); }}
                      />
                      {this.searchEl && this.searchEl.value !== '' ?
                        (
                          <span
                            className="clearSearch"
                            role="button"
                            tabIndex="0"
                            onClick={(e) => { this.clearAllFiltersSearch(e); }}
                          >
                            <span className="glyphicon glyphicon-remove" />
                          </span>
                        ) : ''}
                    </div>
                    : ''}
                </div>
                <div className="profile-indicators filter-section-options">
                  <ul>
                    <li>
                      <ul className="indicators-list">
                        {filterItems}
                      </ul>
                    </li>
                  </ul>
                </div>
                <div className="filter-footer">
                  <div className="filter-footer-section">
                    <div className="filter-footer-content">
                      <table className="filter-footer-controls">
                        <tbody>
                          <tr>
                            <td>
                              <button
                                className={`${doClear ? '' : 'disabled'}`}
                                onClick={(e) => { this.onClearClick(e, doClear); }}
                              >
                                Clear Filters
                      </button>
                            </td>
                            <td>
                              <button
                                className={`${isFilterable ? '' : 'disabled'}`}
                                onClick={(e) => { this.onApplyClick(e, isFilterable); }}
                              >
                                Apply Filters
                      </button>
                            </td>
                          </tr>
                        </tbody>    
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div> : ''
        }  
      
      </div>  
    );
  }
}

Filter.propTypes = {
};

export default connect(mapStateToProps)(Filter);
