import React, { Component } from 'react';
import { connect } from 'react-redux'
import PropTypes from 'prop-types';
import { Actions } from 'gisida';
import Layers from '../Layers/Layers';
import SearchBar from '../Searchbar/SearchBar';
import './Menu.scss';

const mapStateToProps = (state, ownProps) => {
  const MAP = state[ownProps.mapId] || { layers: {} };
  const { LAYERS, AUTH, APP } = state;
  let categories;
  // let layers;
  const { NULL_LAYER_TEXT } = APP;
  if (Object.keys(LAYERS.groups).length) {
    const groupMapper = (layer) => {
      if (typeof layer === 'string') {
        return MAP.layers[layer];
      }

      const subGroup = {};
      Object.keys(layer).forEach(l => {
        subGroup[l] = {
          category: l,
          layers: layer[l].map(groupMapper).filter((l) => typeof l !== 'undefined'),
        }
      });
      return subGroup;
    };
    // build list of LAYERS.categories populated with layers from MAP.layers 
    categories = Object.keys(LAYERS.groups).map((group) => {
      return {
        category: group,
        layers: LAYERS.groups[group].map(groupMapper)
          .filter((l) => typeof l !== 'undefined'),
      };
    });
  } else if (Object.keys(MAP.layers).length) {
    categories = {};
    let category;

    Object.keys(MAP.layers).forEach((l) => {
      if (MAP.layers[l].category) {
        category = MAP.layers[l].category;
        if (!categories[category]) {
          categories[category] = {
            category,
            layers: [],
          };
        }
        categories[category].layers.push(MAP.layers[l]);
      }
    });

    categories = Object.keys(categories).map(c => categories[c]);
  }

  const searchterms = {};
  let parentLayers = [];
  const createSearchItems = (layers, layerdetails, clearParentLayers=true) => {
    Object.keys(layers).forEach(key => {
      // clear parent layers if not recussive
      if (clearParentLayers) {
        parentLayers = [];
      }
      // Add level 2 and above labels to search
      if (parentLayers.length) {
      	searchterms[key] = [...parentLayers]
      }
      layers[key].forEach(layer => {
        if (typeof layer === 'string') {
          const label = layerdetails[layer.trim()] && layerdetails[layer.trim()].label || layer;
          searchterms[label] = {
            id: layer,
            label,
            parentLayers: [...parentLayers, key]
          };
        }
        if (typeof layer === 'object') {
          parentLayers.includes(key) ? null : parentLayers.push(key);
          createSearchItems(layer, layerdetails, false)
        }
      })
    })
  }

  if (MAP.layers && Object.keys(MAP.layers).length) {
    createSearchItems(LAYERS.groups, MAP.layers)
  }

  // Get current region
  const currentRegion = state.REGIONS && state.REGIONS.length ?
    state.REGIONS.filter(region => region.current)[0].name : '';

  return {
    categories,
    // layers, // todo - support layers without categories
    LAYERS,
    AUTH,
    menuId: 'sector-menu-1',
    mapTargetId: '',
    regions: state.REGIONS,
    currentRegion: currentRegion,
    loaded: state.APP.loaded,
    preparedLayers: MAP.layers,
    menuIsOpen: MAP.menuIsOpen,
    openCategories: MAP.openCategories,
    noLayerText: NULL_LAYER_TEXT,
    showSearchBar: APP.searchBar,
    searchterms,
  };
}

class Menu extends Component {
  constructor(props) {
    super(props)
    this.state = {
      openCategories: [],
      searching: false,
      searchResults: [],
    }
    this.handleSearch = this.handleSearch.bind(this);
  }

  onToggleMenu = (e) => {
    e.preventDefault();
    const { dispatch } = this.props;
    dispatch(Actions.toggleMenu(this.props.mapId));
  }

  onCategoryClick = (e, category) => {
    e.preventDefault();
    const { openCategories } = this.props;
    const index = openCategories.indexOf(category);
    this.props.dispatch(Actions.toggleCategories(this.props.mapId, category, index))
  }

  onRegionClick = (e) => {
    const region = e.target.value;
    this.props.dispatch(Actions.changeRegion(region));
  }

  boldQuery(indicator, query){
    const indicatorToUpper = indicator.toUpperCase();
    const queryToUpper = query.toUpperCase();
    if (!indicatorToUpper.includes(queryToUpper)) {
      return null;
    }
    const matchIndex = indicatorToUpper.indexOf(queryToUpper);
    const querryLen = queryToUpper.length;

    return <a>{indicator.substr(0,matchIndex)}<b>{indicator.substr(matchIndex, querryLen)}</b>{indicator.substr(matchIndex+querryLen)}</a>
  }

  handleSearch(e) {
    e.preventDefault();
    let input = e.target.value;
    input = input.replace(/\s+/g, ' ')
    input = input.trimStart()
    const { searching } = this.state;
    const { searchterms } = this.props;
    if (!input) {
      return searching ? this.setState({ searching: false}) : null; 
    }
    this.setState({ searchResults: [], })
    const searchResults = [];
    Object.keys(searchterms).forEach(key => {
        const id = searchterms[key].id;
        const result = this.boldQuery(key, input)
        if (result) {
          searchResults.push(
            <li key={id} className="search-sector">{result}</li>
          )
        }
    })
    this.setState({
      searchResults,
      searching: true
    });
  }

  render() {
    const { searching, searchResults } = this.state;
    const mapId = this.props.mapId;
    const categories = this.props.categories;

    const {disableDefault, showSearchBar } = this.props;
    if (disableDefault) return this.props.children || null;

    const children = React.Children.map(this.props.children, child => {
      return React.cloneElement(child, { mapId });
    })

    const { regions, currentRegion, preparedLayers, childrenPosition } = this.props;
    const childrenPositionClass = childrenPosition || 'top';
    return (
      <div>
          <div>
            {this.props.loaded ?
              // Menu Wrapper
              <div id={`${mapId}-menu-wrapper`} className={`menu-wrapper ${childrenPositionClass}`}>
                {/* Open button menu */}
                <a onClick={e => this.onToggleMenu(e)} className="open-btn"
                  style={{ display: this.props.menuIsOpen ? 'none' : 'block' }}>
                  <span className="glyphicon glyphicon-menu-hamburger"></span>
                </a>
                {/* Menu */}
                <div id={`${mapId}-menu`} className="sectors-menu"
                  style={{ display: this.props.menuIsOpen ? 'block' : 'none' }}>
                  {/* Close menu button */}
                  <a className="close-btn" onClick={e => this.onToggleMenu(e)}>
                    <span className="glyphicon glyphicon-remove"></span>
                  </a>

                  {/* Children Elements (top) */}
                  {(children && childrenPosition !== 'bottom') ? children : ''}

                  {/* search bar */}
                  {showSearchBar ?
                   <div style={{"height":"70px"}}>
                      <SearchBar 
                        handleSearch={this.handleSearch}
                      />
                    </div> : null
                  }
                  {/* Menu List*/}
                  { !searching ?
                    <ul className="sectors">
                      {regions && regions.length ?
                        <li className="sector">
                          <a onClick={e => this.onCategoryClick(e, 'Regions')}>Regions
                            <span className="caret" />
                          </a>
                          <ul className="layers">
                            {regions && regions.length ?
                              regions.map((region, i) =>
                                (<li className={`region ${mapId}`} key={region.name}>
                                  <input
                                    id={region.name}
                                    key={region.name}
                                    name="region"
                                    type="radio"
                                    value={region.name}
                                    checked={!!region.current}
                                    onChange={e => this.onRegionClick(e)}
                                  />
                                  <label htmlFor={region.name}>{region.name}</label>
                                </li>)) :
                              <li></li>
                            }
                          </ul>
                        </li> : <li />}
                      {(categories && categories.length) > 0 ?
                        categories.map((category, i) =>
                          (<li className="sector" key={i}>
                            <a onClick={e => this.onCategoryClick(e, category.category)}>{category.category}
                              <span
                                className={"category glyphicon " +
                                  (this.props.openCategories && this.props.openCategories.includes(category.category) ?
                                    "glyphicon-chevron-down" : "glyphicon-chevron-right")}
                              />
                            </a>
                            {
                              this.props.openCategories && this.props.openCategories.includes(category.category) ?
                                <Layers
                                  mapId={mapId}
                                  layers={category.layers}
                                  currentRegion={currentRegion}
                                  preparedLayers={preparedLayers}
                                  auth={this.props.AUTH}
                                  noLayerText={this.props.noLayerText}
                                />
                                : <ul />}
                          </li>)) :
                        <li></li>
                      }
                    </ul> :
                    searchResults.length ?
                    <ul className="sectors">
                      {searchResults}
                    </ul> : <li /> 
                  }
                  
                  {/* Children Elements (top) */}
                  {(children && childrenPosition === 'bottom') ? children : ''}
                </div>
              </div> : ''}
          </div>
      </div>
    );
  }
}

Menu.propTypes = {
  menuId: PropTypes.string.isRequired,
  // mapTargetId: PropTypes.string.isRequired,
  categories: PropTypes.arrayOf(PropTypes.any).isRequired,
};

export default connect(mapStateToProps)(Menu);
