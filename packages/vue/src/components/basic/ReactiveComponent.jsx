import { Actions, helper } from '@appbaseio/reactivecore';
import { componentTypes } from '@appbaseio/reactivecore/lib/utils/constants';
import VueTypes from 'vue-types';
import {
	connect,
	updateCustomQuery,
	updateDefaultQuery,
	isQueryIdentical,
} from '../../utils/index';
import ComponentWrapper from './ComponentWrapper.jsx';
import types from '../../utils/vueTypes';

const { updateQuery, setQueryOptions, setCustomQuery, setDefaultQuery } = Actions;
const { parseHits, isEqual, getCompositeAggsQuery, getOptionsFromQuery, getResultStats } = helper;
const ReactiveComponent = {
	name: 'ReactiveComponent',
	props: {
		componentId: types.stringRequired,
		aggregationField: types.string,
		aggregationSize: VueTypes.number,
		size: VueTypes.number.def(20),
		defaultQuery: types.func,
		customQuery: types.func,
		filterLabel: types.string,
		react: types.react,
		showFilter: VueTypes.bool.def(true),
		URLParams: VueTypes.bool.def(false),
		distinctField: types.string,
		distinctFieldConfig: types.props,
		index: VueTypes.string,
	},
	created() {
		const props = this.$props;
		this.internalComponent = null;
		this.$defaultQuery = null;
		// Set custom query in store
		updateCustomQuery(this.componentId, this.setCustomQuery, this.$props, this.selectedValue);

		const { customQuery, componentId, filterLabel, showFilter, URLParams, distinctField, distinctFieldConfig, index } = props;

		if (this.enableAppbase && this.aggregationField && this.aggregationField !== '') {
			console.warn(
				'Warning(ReactiveSearch): The `aggregationField` prop has been marked as deprecated, please use the `distinctField` prop instead.',
			);
		}
		if (!this.enableAppbase && (distinctField || distinctFieldConfig)) {
			console.warn(
				'Warning(ReactiveSearch): In order to use the `distinctField` and `distinctFieldConfig` props, the `enableAppbase` prop must be set to true in `ReactiveBase`.',
			);
		}
		if (!this.enableAppbase && index) {
			console.warn(
				'Warning(ReactiveSearch): In order to use the `index` prop, the `enableAppbase` prop must be set to true in `ReactiveBase`.',
			);
		}

		if (customQuery) {
			const calcCustomQuery = customQuery(this.selectedValue, props);
			const { query } = calcCustomQuery || {};
			const customQueryOptions = calcCustomQuery
				? getOptionsFromQuery(calcCustomQuery)
				: null;
			if (customQueryOptions) {
				this.setQueryOptions(
					componentId,
					{ ...customQueryOptions, ...this.getAggsQuery() },
					false,
				);
			} else this.setQueryOptions(componentId, this.getAggsQuery(), false);

			let queryToSet = query || null
			if (calcCustomQuery && calcCustomQuery.id) {
				queryToSet = calcCustomQuery
			}
			this.updateQuery({
				componentId,
				query: queryToSet,
				value: this.selectedValue || null,
				label: filterLabel,
				showFilter,
				URLParams,
			});
		}

		this.setQuery = ({ options, ...obj }) => {
			if (options) {
				this.setQueryOptions(
					props.componentId,
					{ ...options, ...this.getAggsQuery() },
					false,
				);
			}
			let queryToBeSet = obj.query;

			// when enableAppbase is true, Backend throws error because of repeated query in request body
			if (obj && obj.query && obj.query.query) {
				queryToBeSet = obj.query.query;
			}
			// Update customQuery field for RS API
			if ((obj && obj.query) || options) {
				let customQueryCalc = { ...options };
				if (obj && obj.query) {
					if (obj.query.id) {
						customQueryCalc = queryToBeSet;
					} else {
						customQueryCalc.query = obj.query;
					}

				}

				this.setCustomQuery(props.componentId, customQueryCalc);
			}
			this.updateQuery({
				...obj,
				componentId: props.componentId,
				label: props.filterLabel,
				showFilter: props.showFilter,
				URLParams: props.URLParams,
			});
		};

		if (props.defaultQuery) {
			this.internalComponent = `${props.componentId}__internal`;
		}
	},
	beforeMount() {
		if (this.internalComponent && this.$props.defaultQuery) {
			updateDefaultQuery(this.componentId, this.setDefaultQuery, this.$props, this.selectedValue);
			this.$defaultQuery = this.$props.defaultQuery(this.selectedValue, this.$props);
			const { query, ...queryOptions } = this.$defaultQuery || {};

			if (queryOptions) {
				this.setQueryOptions(
					this.internalComponent,
					{ ...queryOptions, ...this.getAggsQuery() },
					false,
				);
			} else this.setQueryOptions(this.internalComponent, this.getAggsQuery(), false);

			let queryToSet = query || null;
			if (!queryToSet && this.$defaultQuery && this.$defaultQuery.id) {
				queryToSet = this.$defaultQuery;
			}

			this.updateQuery({
				componentId: this.internalComponent,
				query: queryToSet,
			});
		}
	},
	watch: {
		hits(newVal, oldVal) {
			if (!isEqual(newVal, oldVal)) {
				this.$emit('data', this.getData());
			}
		},
		rawData(newVal, oldVal) {
			if (!isEqual(newVal, oldVal)) {
				this.$emit('data', this.getData());
			}
		},
		aggregations(newVal, oldVal) {
			if (!isEqual(newVal, oldVal)) {
				this.$emit('data', this.getData());
			}
		},
		aggregationData(newVal, oldVal) {
			if (!isEqual(newVal, oldVal)) {
				this.$emit('data', this.getData());
			}
		},
		promotedResults(newVal, oldVal) {
			if (!isEqual(newVal, oldVal)) {
				this.$emit('data', this.getData());
			}
		},
		hidden(newVal, oldVal) {
			if (!isEqual(newVal, oldVal)) {
				this.$emit('data', this.getData());
			}
		},
		total(newVal, oldVal) {
			if (!isEqual(newVal, oldVal)) {
				this.$emit('data', this.getData());
			}
		},
		time(newVal, oldVal) {
			if (!isEqual(newVal, oldVal)) {
				this.$emit('data', this.getData());
			}
		},
		defaultQuery(newVal, oldVal) {
			if (newVal && !isQueryIdentical(newVal, oldVal, this.selectedValue, this.$props)) {
				this.$defaultQuery = newVal(this.selectedValue, this.$props);
				const { query, ...queryOptions } = this.$defaultQuery || {};

				if (queryOptions) {
					this.setQueryOptions(
						this.internalComponent,
						{ ...queryOptions, ...this.getAggsQuery() },
						false,
					);
				} else this.setQueryOptions(this.internalComponent, this.getAggsQuery(), false);
				// Update default query for RS API
				updateDefaultQuery(this.componentId, this.setDefaultQuery, this.$props, this.selectedValue);

				let queryToSet = query || null;
				if (!queryToSet && this.$defaultQuery && this.$defaultQuery.id) {
					queryToSet = this.$defaultQuery;
				}

				this.updateQuery({
					componentId: this.internalComponent,
					query: queryToSet,
				});
			}
		},
		customQuery(newVal, oldVal) {
			if (newVal && !isQueryIdentical(newVal, oldVal, this.selectedValue, this.$props)) {
				const { componentId } = this.$props;
				this.$customQuery = newVal(this.selectedValue, this.$props);
				const { query, ...queryOptions } = this.$customQuery || {};

				if (queryOptions) {
					this.setQueryOptions(
						componentId,
						{ ...queryOptions, ...this.getAggsQuery() },
						false,
					);
				} else this.setQueryOptions(componentId, this.getAggsQuery(), false);

				// Update custom query for RS API
				updateCustomQuery(this.componentId, this.setCustomQuery, this.$props, this.selectedValue);
				let queryToSet = query || null
				if (this.$customQuery && this.$customQuery.id) {
					queryToSet = this.$customQuery
				}
				this.updateQuery({
					componentId,
					query: queryToSet,
				});
			}
		},
	},

	render() {
		try {
			const dom = this.$scopedSlots.default;
			const { error, isLoading, selectedValue } = this;
			const propsToBePassed = {
				error,
				loading: isLoading,
				...this.getData(),
				value: selectedValue,
				setQuery: this.setQuery,
			};
			return <div>{dom(propsToBePassed)}</div>;
		} catch (e) {
			return null;
		}
	},

	methods: {
		getAggsQuery() {
			if (this.aggregationField) {
				return { aggs: getCompositeAggsQuery(
					{
						props:this.$props,
						showTopHits: true,
						value: this.selectedValue,
					}
				).aggs };
			}
			return {};
		},
		getData() {
			const { hits, aggregations, aggregationData, promotedResults, rawData } = this;
			let filteredResults = parseHits(hits);
			if (promotedResults.length) {
				const ids = promotedResults.map(item => item._id).filter(Boolean);
				if (ids) {
					filteredResults = filteredResults.filter(item => !ids.includes(item._id));
				}
				filteredResults = [...promotedResults, ...filteredResults];
			}
			return {
				data: filteredResults,
				aggregationData,
				rawData,
				aggregations,
				promotedData: promotedResults,
				resultStats: this.stats,
			};
		},
	},
	computed: {
		stats() {
			return getResultStats(this);
		},
	},
};

const mapStateToProps = (state, props) => ({
	aggregations:
		(state.aggregations[props.componentId] && state.aggregations[props.componentId]) || null,
	aggregationData: state.compositeAggregations[props.componentId] || [],
	hits: (state.hits[props.componentId] && state.hits[props.componentId].hits) || [],
	rawData: state.rawData[props.componentId],
	error: state.error[props.componentId],
	isLoading: state.isLoading[props.componentId],
	selectedValue:
		(state.selectedValues[props.componentId]
			&& state.selectedValues[props.componentId].value)
		|| null,
	promotedResults: state.promotedResults[props.componentId] || [],
	time: (state.hits[props.componentId] && state.hits[props.componentId].time) || 0,
	total: state.hits[props.componentId] && state.hits[props.componentId].total,
	hidden: state.hits[props.componentId] && state.hits[props.componentId].hidden,
	componentProps: state.props[props.componentId],
	enableAppbase: state.config.enableAppbase,
});

const mapDispatchtoProps = {
	setQueryOptions,
	updateQuery,
	setCustomQuery,
	setDefaultQuery,
};

const RcConnected = ComponentWrapper(
	connect(mapStateToProps, mapDispatchtoProps)(ReactiveComponent),
	{
		componentType: componentTypes.reactiveComponent,
	},
);

ReactiveComponent.install = function(Vue) {
	Vue.component(ReactiveComponent.name, RcConnected);
};

// Add componentType for SSR
ReactiveComponent.componentType = componentTypes.reactiveComponent;

export default ReactiveComponent;
